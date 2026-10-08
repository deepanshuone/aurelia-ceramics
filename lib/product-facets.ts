// Colour and material for the shop filters. Products don't have dedicated
// fields for these, so they are read from the specification rows an admin
// fills in ("Material: Stoneware", "Colour: Blue", "Finish: Indigo Glaze"),
// falling back to colour words in the product name. A product with neither
// simply doesn't show up under a colour or material filter.

export const COLOURS = [
  "White",
  "Black",
  "Grey",
  "Blue",
  "Green",
  "Red",
  "Pink",
  "Yellow",
  "Orange",
  "Brown",
  "Gold",
] as const;

// Words that point at a colour, matched as whole words in lower case.
const COLOUR_WORDS: Record<(typeof COLOURS)[number], string[]> = {
  White: ["white", "ivory", "cream", "pearl", "milk", "snow"],
  Black: ["black", "charcoal", "ebony", "midnight", "jet"],
  Grey: ["grey", "gray", "slate", "ash", "smoke", "stone"],
  Blue: ["blue", "indigo", "cobalt", "navy", "sky", "turquoise", "teal", "aqua", "denim"],
  Green: ["green", "celadon", "olive", "mint", "sage", "jade", "emerald", "moss"],
  Red: ["red", "oxblood", "maroon", "crimson", "burgundy", "wine"],
  Pink: ["pink", "rose", "blush", "coral", "peach"],
  Yellow: ["yellow", "mustard", "honey", "ochre", "lemon"],
  Orange: ["orange", "tangerine", "rust", "amber"],
  Brown: ["brown", "terracotta", "clay", "sand", "beige", "tan", "caramel", "coffee", "mocha", "earth"],
  Gold: ["gold", "golden"],
};

const MATERIALS = ["Porcelain", "Stoneware", "Bone China", "Terracotta", "Earthenware", "Ceramic"] as const;

type SpecRow = [string, string];

function specRows(specifications: unknown): SpecRow[] {
  if (!Array.isArray(specifications)) return [];
  return specifications.filter(
    (row): row is SpecRow => Array.isArray(row) && typeof row[0] === "string" && typeof row[1] === "string"
  );
}

function specValue(rows: SpecRow[], ...labels: string[]) {
  const wanted = labels.map((l) => l.toLowerCase());
  return rows.find(([label]) => wanted.includes(label.trim().toLowerCase()))?.[1] ?? null;
}

function coloursIn(text: string): string[] {
  const tokens = new Set(text.toLowerCase().split(/[^a-z]+/).filter(Boolean));
  return COLOURS.filter((colour) => COLOUR_WORDS[colour].some((word) => tokens.has(word)));
}

/** Colours of a product: an explicit Colour row wins, then the finish, then the name. */
export function productColours(name: string, specifications: unknown): string[] {
  const rows = specRows(specifications);
  const explicit = specValue(rows, "colour", "color", "colours", "colors");
  if (explicit) {
    const found = coloursIn(explicit);
    if (found.length > 0) return found;
  }
  const finish = specValue(rows, "finish", "glaze");
  const fromFinish = finish ? coloursIn(finish) : [];
  if (fromFinish.length > 0) return fromFinish;
  // "Stone" and "clay" in a name usually describe the look, not the colour.
  return coloursIn(name.replace(/\b(stone|clay|earth)\b/gi, " "));
}

/** Main material from the Material row, grouped into a short list ("Terracotta, Glazed Inside" → Terracotta). */
export function productMaterial(specifications: unknown): string | null {
  const value = specValue(specRows(specifications), "material", "materials");
  if (!value) return null;
  const lower = value.toLowerCase();
  const known = MATERIALS.find((m) => lower.includes(m.toLowerCase()));
  if (known) return known;
  if (/\bclay\b/.test(lower)) return "Clay";
  // Anything else is shown as written, trimmed to its first part.
  return value.split(/[,/(]/)[0].trim().slice(0, 30) || null;
}
