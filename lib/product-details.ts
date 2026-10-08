// Turns a product's detail fields (and its older free-form "Label: Value"
// specification lines) into the grouped lists the product page shows. Only
// details that are filled in appear; nothing is assumed.

export type ProductDetailFields = {
  dimensions: string | null;
  weight: string | null;
  material: string | null;
  capacity: string | null;
  colour: string | null;
  finish: string | null;
  whatsIncluded: string | null;
  careInstructions: string | null;
  foodSafe: boolean | null;
  microwaveSafe: boolean | null;
  dishwasherSafe: boolean | null;
  specifications: unknown;
};

export type DetailRow = { label: string; value: string };

/** Safety facts shown as badges near the price, only when the answer is "yes". */
export type SafetyFlag = { key: "foodSafe" | "microwaveSafe" | "dishwasherSafe"; label: string; value: boolean };

export type ProductDetails = {
  /** Size, material, colour, finish… */
  build: DetailRow[];
  safety: SafetyFlag[];
  care: string | null;
  included: string | null;
  /** Specification lines that don't match a known field (e.g. "Usage"). */
  other: DetailRow[];
};

const norm = (label: string) => label.toLowerCase().replace(/[^a-z]/g, "");

/** Spec labels that mean the same thing as a dedicated field. */
const TEXT_FIELDS = [
  { field: "dimensions", label: "Dimensions", aliases: ["dimensions", "dimension", "size"] },
  { field: "weight", label: "Weight", aliases: ["weight"] },
  { field: "capacity", label: "Capacity", aliases: ["capacity", "volume"] },
  { field: "material", label: "Material", aliases: ["material"] },
  { field: "colour", label: "Colour", aliases: ["colour", "color"] },
  { field: "finish", label: "Finish", aliases: ["finish", "glaze"] },
] as const;

/** Size-like spec lines kept beside the dimensions (e.g. "Diameter: 27 cm"). */
const BUILD_EXTRA = new Set(["diameter", "height", "length", "width", "depth", "pieces"]);

const SAFETY_FIELDS = [
  { field: "foodSafe", label: "Food safe", aliases: ["foodsafe", "foodgrade", "leadfree"] },
  { field: "microwaveSafe", label: "Microwave safe", aliases: ["microwavesafe", "microwave"] },
  { field: "dishwasherSafe", label: "Dishwasher safe", aliases: ["dishwashersafe", "dishwasher"] },
] as const;

const CARE_ALIASES = ["care", "careinstructions", "cleaning"];
const INCLUDED_ALIASES = ["whatsincluded", "inthebox", "included", "contents"];

function specRows(specifications: unknown): DetailRow[] {
  if (!Array.isArray(specifications)) return [];
  return specifications
    .filter((row): row is [string, string] => Array.isArray(row) && typeof row[0] === "string" && typeof row[1] === "string")
    .map(([label, value]) => ({ label, value }));
}

function yesNo(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (/^(yes|y|true|safe)\b/.test(v)) return true;
  if (/^(no|n|false|not)\b/.test(v)) return false;
  return null;
}

const filled = (value: string | null | undefined) => (value && value.trim() ? value.trim() : null);

export function buildProductDetails(product: ProductDetailFields): ProductDetails {
  const specs = specRows(product.specifications);
  const used = new Set<number>();
  const findSpec = (aliases: readonly string[]) => {
    const index = specs.findIndex((row, i) => !used.has(i) && aliases.includes(norm(row.label)));
    if (index === -1) return null;
    used.add(index);
    return specs[index].value;
  };

  const build: DetailRow[] = [];
  for (const { field, label, aliases } of TEXT_FIELDS) {
    // The dedicated field wins; a matching spec line is still consumed so it isn't shown twice.
    const fromSpec = findSpec(aliases);
    const value = filled(product[field]) ?? filled(fromSpec);
    if (value) build.push({ label, value });
  }
  specs.forEach((row, i) => {
    if (!used.has(i) && BUILD_EXTRA.has(norm(row.label))) {
      used.add(i);
      build.push(row);
    }
  });

  const safety: SafetyFlag[] = [];
  for (const { field, label, aliases } of SAFETY_FIELDS) {
    const fromSpec = findSpec(aliases);
    const value = product[field] ?? (fromSpec !== null ? yesNo(fromSpec) : null);
    if (value !== null) safety.push({ key: field, label, value });
  }

  const care = filled(product.careInstructions) ?? filled(findSpec(CARE_ALIASES));
  const included = filled(product.whatsIncluded) ?? filled(findSpec(INCLUDED_ALIASES));
  const other = specs.filter((_, i) => !used.has(i));

  return { build, safety, care, included, other };
}
