import Image, { type ImageProps } from "next/image";

// Keep in sync with images.remotePatterns in next.config.ts.
const OPTIMISED_HOSTS = new Set(["images.unsplash.com"]);

function canOptimise(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && OPTIMISED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * next/image for product and category photos. Local files and trusted hosts
 * are resized/converted by Next; any other URL an admin enters still works,
 * just without optimisation.
 */
export default function SmartImage({ src, ...props }: ImageProps & { src: string }) {
  return <Image src={src} unoptimized={!canOptimise(src)} {...props} />;
}
