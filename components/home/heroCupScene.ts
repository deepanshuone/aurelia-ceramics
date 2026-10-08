import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * The hero's 3D cup and saucer, built from code (no model file to download).
 * The cup leans towards the pointer, spins when dragged, hops when tapped and
 * its coffee sloshes with the motion. Rendering pauses while the hero is off
 * screen or the tab is hidden.
 */

export type HeroCupOptions = {
  reducedMotion: boolean;
  onFirstInteraction?: () => void;
};

export type HeroCupScene = {
  setActive(active: boolean): void;
  dispose(): void;
};

const GLAZE = new THREE.Color("#efe6d8");
const CLAY = new THREE.Color("#c29873");
const RIM = new THREE.Color("#6b5947");

const COFFEE_LEVEL = 1.0;
const CUP_SEAT = 0.085;

// Radius/height profiles, outer surface first, then back down the inside.
const CUP_PROFILE: [number, number][] = [
  [0.0, 0.06], [0.42, 0.06], [0.47, 0.0], [0.53, 0.0], [0.57, 0.06], [0.63, 0.14],
  [0.78, 0.36], [0.9, 0.66], [0.97, 0.98], [1.0, 1.22], [0.995, 1.27],
  [0.965, 1.27], [0.955, 1.22], [0.93, 0.98], [0.86, 0.68], [0.74, 0.4],
  [0.55, 0.22], [0.0, 0.18],
];
const CUP_RIM_INDEX = 10;

const SAUCER_PROFILE: [number, number][] = [
  [0.0, 0.04], [0.7, 0.04], [0.74, 0.0], [0.82, 0.0], [0.86, 0.04], [1.4, 0.1],
  [1.75, 0.22], [1.8, 0.255], [1.78, 0.275], [1.72, 0.255], [1.38, 0.145],
  [0.9, CUP_SEAT + 0.005], [0.0, CUP_SEAT],
];
const SAUCER_RIM_INDEX = 7;

type Profile = { points: THREE.Vector2[]; outer: boolean[] };

/** Smooth a profile and remember which points are on the outside surface. */
function smoothProfile(raw: [number, number][], rimIndex: number, count: number): Profile {
  const curve = new THREE.CatmullRomCurve3(
    raw.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    "centripetal",
  );
  // Arc-length position of the rim, so points can be split into outside/inside.
  const lengths = curve.getLengths(raw.length * 40);
  const rimT = rimIndex / (raw.length - 1);
  const rimLength = lengths[Math.round(rimT * (lengths.length - 1))];
  const total = lengths[lengths.length - 1];
  const points = curve.getSpacedPoints(count - 1).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  const outer = points.map((_, i) => (i / (count - 1)) * total <= rimLength);
  return { points, outer };
}

/** Radius of the inside wall at a height, read off the smoothed profile. */
function innerRadiusAt(profile: Profile, y: number): number {
  let best = 0;
  let bestDistance = Infinity;
  profile.points.forEach((p, i) => {
    if (profile.outer[i]) return;
    const d = Math.abs(p.y - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = p.x;
    }
  });
  return best;
}

/** Deterministic pseudo-random numbers so the speckles look the same on every visit. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Colour and finish maps for a lathe surface: raw clay foot with a wavy dip
 * line, speckled cream glaze, brown painted rim. Rows follow the profile
 * (texture v), columns go around the piece (texture u).
 */
function surfaceMaps(profile: Profile, dipLine: number, rimFrom: number, seed: number) {
  const width = 512;
  const height = profile.points.length;
  const color = new Uint8Array(width * height * 4);
  const finish = new Uint8Array(width * height * 4);
  const random = seeded(seed);
  const tmp = new THREE.Color();

  for (let row = 0; row < height; row++) {
    const { x: radius, y } = profile.points[row];
    const outside = profile.outer[row];
    for (let col = 0; col < width; col++) {
      const u = col / width;
      const angle = u * Math.PI * 2;
      const dip =
        dipLine +
        0.035 * Math.sin(angle * 3) +
        0.02 * Math.sin(angle * 7 + 1.3) +
        // A couple of longer glaze drips.
        0.07 * Math.max(0, Math.sin(angle * 2 + 0.6)) ** 24;
      const bare = outside && y < dip && radius > 0.05;
      const rim = y > rimFrom;
      const grain = random();

      if (rim) tmp.copy(RIM).multiplyScalar(0.92 + grain * 0.12);
      else if (bare) tmp.copy(CLAY).multiplyScalar(0.9 + grain * 0.14);
      else tmp.copy(GLAZE).multiplyScalar(grain > 0.994 ? 0.55 : 0.97 + grain * 0.03);

      const i = (row * width + col) * 4;
      // Data textures are read as linear; store sRGB bytes and tag the texture.
      color[i] = Math.round(tmp.r * 255);
      color[i + 1] = Math.round(tmp.g * 255);
      color[i + 2] = Math.round(tmp.b * 255);
      color[i + 3] = 255;
      // R = clearcoat strength, G = roughness.
      finish[i] = bare ? 0 : 255;
      finish[i + 1] = bare ? 235 : rim ? 90 : 70;
      finish[i + 2] = 0;
      finish[i + 3] = 255;
    }
  }

  const map = new THREE.DataTexture(color, width, height);
  map.colorSpace = THREE.SRGBColorSpace;
  const finishMap = new THREE.DataTexture(finish, width, height);
  for (const t of [map, finishMap]) {
    t.wrapS = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
  }
  return { map, finishMap };
}

function ceramicMaterial(maps: { map: THREE.Texture; finishMap: THREE.Texture }) {
  return new THREE.MeshPhysicalMaterial({
    map: maps.map,
    roughness: 1,
    roughnessMap: maps.finishMap,
    clearcoat: 1,
    clearcoatMap: maps.finishMap,
    clearcoatRoughness: 0.12,
    side: THREE.DoubleSide,
  });
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Coffee with a crema ring and a little latte-art heart. */
function coffeeTexture() {
  return canvasTexture(256, (ctx, s) => {
    const c = s / 2;
    const base = ctx.createRadialGradient(c, c, 0, c, c, c);
    base.addColorStop(0, "#4a2c19");
    base.addColorStop(0.72, "#5a351d");
    base.addColorStop(0.9, "#9a6a40");
    base.addColorStop(1, "#c79a6b");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);

    ctx.save();
    ctx.translate(c, c * 1.04);
    ctx.scale(s / 256, s / 256);
    ctx.fillStyle = "rgba(243, 226, 200, 0.92)";
    ctx.shadowColor = "rgba(243, 226, 200, 0.6)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.bezierCurveTo(-62, 6, -58, -50, -18, -50);
    ctx.bezierCurveTo(-4, -50, 0, -38, 0, -30);
    ctx.bezierCurveTo(0, -38, 4, -50, 18, -50);
    ctx.bezierCurveTo(58, -50, 62, 6, 0, 46);
    ctx.fill();
    ctx.restore();
  });
}

function softDotTexture(inner: string, outer: string) {
  return canvasTexture(128, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

function handleGeometry() {
  // Ends approach the wall horizontally so the open tube ends stay buried in it.
  const curve = new THREE.CatmullRomCurve3(
    [
      [0.96, 1.04], [1.08, 1.05], [1.3, 1.02], [1.42, 0.84], [1.36, 0.6],
      [1.18, 0.45], [0.98, 0.42], [0.8, 0.42],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    "centripetal",
  );
  const geometry = new THREE.TubeGeometry(curve, 72, 0.072, 20, false);
  geometry.scale(1, 1, 0.72);
  return geometry;
}

export function createHeroCupScene(container: HTMLElement, options: HeroCupOptions): HeroCupScene {
  const { reducedMotion } = options;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight("#ffe8cc", 2.2);
  key.position.set(-3, 5, 4);
  const rim = new THREE.DirectionalLight("#cfd8ff", 1.1);
  rim.position.set(4, 2.5, -3);
  const fill = new THREE.HemisphereLight("#fff4e6", "#2a211a", 0.5);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const lookAt = new THREE.Vector3(0, 0.62, 0);

  // Disposables, released together on unmount.
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [environment];
  const track = <T extends THREE.BufferGeometry>(g: T) => (geometries.push(g), g);
  const trackMaterial = <T extends THREE.Material>(m: T) => (materials.push(m), m);

  // The whole set tilts towards the pointer; the cup also spins on the saucer.
  const set = new THREE.Group();
  scene.add(set);

  const saucerProfile = smoothProfile(SAUCER_PROFILE, SAUCER_RIM_INDEX, 120);
  const saucerMaps = surfaceMaps(saucerProfile, 0.045, 0.235, 7);
  textures.push(saucerMaps.map, saucerMaps.finishMap);
  const saucer = new THREE.Mesh(
    track(new THREE.LatheGeometry(saucerProfile.points, 128)),
    trackMaterial(ceramicMaterial(saucerMaps)),
  );
  set.add(saucer);

  const shadowTexture = softDotTexture("rgba(0,0,0,0.55)", "rgba(0,0,0,0)");
  textures.push(shadowTexture);
  const shadow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(4.6, 4.6)),
    trackMaterial(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.005;
  set.add(shadow);

  const cup = new THREE.Group();
  cup.position.y = CUP_SEAT;
  set.add(cup);

  const cupProfile = smoothProfile(CUP_PROFILE, CUP_RIM_INDEX, 200);
  const cupMaps = surfaceMaps(cupProfile, 0.2, 1.235, 3);
  textures.push(cupMaps.map, cupMaps.finishMap);
  const glaze = trackMaterial(ceramicMaterial(cupMaps));
  cup.add(new THREE.Mesh(track(new THREE.LatheGeometry(cupProfile.points, 160)), glaze));

  const handle = new THREE.Mesh(
    track(handleGeometry()),
    trackMaterial(
      new THREE.MeshPhysicalMaterial({ color: GLAZE, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }),
    ),
  );
  cup.add(handle);

  const coffeeMap = coffeeTexture();
  textures.push(coffeeMap);
  const coffee = new THREE.Mesh(
    track(new THREE.CircleGeometry(innerRadiusAt(cupProfile, COFFEE_LEVEL) - 0.005, 96)),
    trackMaterial(new THREE.MeshPhysicalMaterial({ map: coffeeMap, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 })),
  );
  coffee.rotation.x = -Math.PI / 2;
  const coffeePivot = new THREE.Group();
  coffeePivot.position.y = COFFEE_LEVEL;
  coffeePivot.add(coffee);
  cup.add(coffeePivot);

  // Steam: a few soft wisps that rise straight up whatever the cup is doing.
  const steamTexture = softDotTexture("rgba(255,255,255,0.9)", "rgba(255,255,255,0)");
  textures.push(steamTexture);
  const steam = Array.from({ length: reducedMotion ? 0 : 7 }, (_, i) => {
    const material = trackMaterial(
      new THREE.SpriteMaterial({ map: steamTexture, transparent: true, depthWrite: false, opacity: 0 }),
    );
    const sprite = new THREE.Sprite(material);
    scene.add(sprite);
    return { sprite, material, offset: i / 7, drift: (i % 2 ? 1 : -1) * (0.15 + (i % 3) * 0.06) };
  });

  // ---- Interaction state ----
  const pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };
  let spin = -0.6;
  let spinVelocity = reducedMotion ? 0 : 0.35;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let lastX = 0;
  let lastMoveTime = 0;
  let hopTime = -1;
  let steamBoost = 0;
  const slosh = new THREE.Vector2();
  const sloshVelocity = new THREE.Vector2();
  let interacted = false;

  const markInteracted = () => {
    if (interacted) return;
    interacted = true;
    options.onFirstInteraction?.();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || reducedMotion) return;
    const rect = container.getBoundingClientRect();
    pointer.x = THREE.MathUtils.clamp(((event.clientX - (rect.left + rect.width / 2)) / window.innerWidth) * 2, -1, 1);
    pointer.y = THREE.MathUtils.clamp(((event.clientY - (rect.top + rect.height / 2)) / window.innerHeight) * 2, -1, 1);
  };

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    dragStartX = lastX = event.clientX;
    dragStartY = event.clientY;
    lastMoveTime = performance.now();
    spinVelocity = 0;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  };

  const onDragMove = (event: PointerEvent) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = event.clientX - lastX;
    const dt = Math.max(1, now - lastMoveTime) / 1000;
    spin += dx * 0.012;
    spinVelocity = THREE.MathUtils.lerp(spinVelocity, (dx * 0.012) / dt, 0.5);
    sloshVelocity.x += dx * 0.004;
    lastX = event.clientX;
    lastMoveTime = now;
    if (Math.abs(event.clientX - dragStartX) > 4) markInteracted();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    // A drag that stopped before release shouldn't keep spinning.
    if (performance.now() - lastMoveTime > 80) spinVelocity = 0;
    const moved = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY);
    if (moved < 6) {
      // Tap: the cup hops, twirls and sloshes.
      hopTime = 0;
      spinVelocity = (Math.random() > 0.5 ? 1 : -1) * 9;
      sloshVelocity.set((Math.random() - 0.5) * 3, 2.2);
      steamBoost = 1;
      markInteracted();
    }
    spinVelocity = THREE.MathUtils.clamp(spinVelocity, -14, 14);
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onDragMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull back on narrow boxes so the saucer is never cropped.
    const distance = 8.2 * Math.max(1, 1.15 / camera.aspect);
    camera.position.set(0, distance * 0.36, distance);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const timer = new THREE.Timer();
  let elapsed = 0;
  let running = false;
  const cupTop = new THREE.Vector3();

  const frame = (timestamp?: number) => {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 1 / 20);
    elapsed += dt;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);

    // Lean towards the pointer.
    const targetX = 0.06 + pointer.y * 0.28;
    const targetY = pointer.x * 0.55;
    const prevTiltX = tilt.x;
    const prevTiltY = tilt.y;
    tilt.x += (targetX - tilt.x) * ease(4);
    tilt.y += (targetY - tilt.y) * ease(4);
    set.rotation.x = tilt.x;
    set.rotation.z = -tilt.y * 0.18;
    set.rotation.y = tilt.y * 0.4;
    set.position.x = pointer.x * 0.12;

    // Spin with inertia, settling back to a slow idle turn.
    if (!dragging) {
      const idle = reducedMotion ? 0 : 0.35;
      spinVelocity += (idle * Math.sign(spinVelocity || 1) - spinVelocity) * ease(1.4);
      spin += spinVelocity * dt;
    }
    cup.rotation.y = spin;

    // Gentle float and the tap hop.
    let hop = 0;
    if (hopTime >= 0) {
      hopTime += dt;
      const t = hopTime / 0.55;
      if (t >= 1) hopTime = -1;
      else hop = Math.sin(Math.PI * t) * 0.55;
    }
    set.position.y = reducedMotion ? 0 : Math.sin(elapsed * 1.1) * 0.05;
    cup.position.y = CUP_SEAT + hop;
    cup.rotation.x = hop * 0.25;

    // Coffee sloshes against the motion, as a damped spring.
    sloshVelocity.x += ((tilt.y - prevTiltY) / Math.max(dt, 1e-3)) * 0.04;
    sloshVelocity.y += ((tilt.x - prevTiltX) / Math.max(dt, 1e-3)) * 0.04;
    sloshVelocity.x += (-slosh.x * 60 - sloshVelocity.x * 4) * dt;
    sloshVelocity.y += (-slosh.y * 60 - sloshVelocity.y * 4) * dt;
    slosh.addScaledVector(sloshVelocity, dt);
    slosh.clampLength(0, 0.1);
    coffeePivot.rotation.set(slosh.y, 0, -slosh.x);

    // Steam rises from the cup's opening in world space.
    if (steam.length) {
      steamBoost = Math.max(0, steamBoost - dt * 0.6);
      cupTop.set(0, 1.3, 0);
      cup.localToWorld(cupTop);
      for (const wisp of steam) {
        const life = (elapsed * 0.22 + wisp.offset) % 1;
        const sway = Math.sin(elapsed * 1.3 + wisp.offset * 9) * 0.12;
        wisp.sprite.position.set(cupTop.x + wisp.drift * life + sway * life, cupTop.y + life * 1.25, cupTop.z);
        const size = 0.35 + life * 0.9 + steamBoost * 0.3;
        wisp.sprite.scale.set(size, size, 1);
        wisp.material.opacity = Math.sin(Math.PI * life) * (0.14 + steamBoost * 0.14);
      }
    }

    renderer.render(scene, camera);
  };

  const setActive = (active: boolean) => {
    if (active === running) return;
    running = active;
    if (active) {
      timer.reset();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  };

  resize();
  frame();

  return {
    setActive,
    dispose() {
      setActive(false);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onDragMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      timer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
