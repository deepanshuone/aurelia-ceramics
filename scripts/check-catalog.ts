// Sanity-checks the seed catalogue: every product image exists in /public,
// slugs and codes are unique, and no product photo is left unused.
// Usage: npx tsx scripts/check-catalog.ts
import fs from "node:fs";
import { moreProducts } from "../prisma/catalog";
import { khurjaRangeProducts } from "../prisma/catalog-khurja";
import { khurjaRange2Products } from "../prisma/catalog-khurja-2";

const all = [...moreProducts, ...khurjaRangeProducts, ...khurjaRange2Products];
const duplicates = (key: "slug" | "code") =>
  all.map((p) => p[key]).filter((value, index, list) => list.indexOf(value) !== index);

const missing = all.filter((p) => p.image.startsWith("/") && !fs.existsSync(`public${p.image}`)).map((p) => p.slug);
const unused = fs
  .readdirSync("public/products")
  .filter((file) => file.endsWith(".jpg"))
  .filter((file) => !all.some((p) => p.image === `/products/${file}`));
const badPrices = all.filter((p) => p.mrp < p.price || p.price <= 0).map((p) => p.slug);

console.log(`${all.length} catalogue products`);
const problems = { missingImages: missing, duplicateSlugs: duplicates("slug"), duplicateCodes: duplicates("code"), unusedImages: unused, badPrices };
for (const [name, list] of Object.entries(problems)) console.log(`${name}: ${list.length ? list.join(", ") : "none"}`);
process.exit(Object.values(problems).some((list) => list.length) ? 1 : 0);
