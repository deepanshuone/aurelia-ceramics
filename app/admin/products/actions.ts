"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type ActionState,
  checkbox,
  firstIssue,
  isUniqueViolation,
  money,
  optionalMoney,
  optionalText,
  requireAdmin,
  slugify,
} from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";

const imageUrl = z
  .string()
  .trim()
  .refine(
    (value) => /^https:\/\/\S+$/i.test(value) || /^\/[\w\-./]+$/.test(value),
    "Image URLs must start with https:// or / (a file in /public)."
  );

const productSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required.").max(120),
    slug: z.string().trim().max(80),
    code: z
      .string()
      .trim()
      .min(2, "Product code is required.")
      .max(40)
      .regex(/^[A-Za-z0-9-]+$/, "Product code may only contain letters, numbers and dashes.")
      .transform((value) => value.toUpperCase()),
    categoryId: z.string().min(1, "Choose a category."),
    price: money("Price").refine((value) => value > 0, "Price must be more than zero."),
    mrp: optionalMoney("MRP"),
    stock: z
      .string()
      .trim()
      .min(1, "Stock is required (enter 0 if there is none).")
      .transform((value) => Number(value))
      .pipe(
        z
          .number({ message: "Stock must be a whole number." })
          .int("Stock must be a whole number.")
          .min(0, "Stock can't be negative.")
          .max(1_000_000)
      ),
    description: optionalText(5000),
    specifications: z.string().max(5000),
    images: z.string().max(10000),
    isActive: checkbox,
    isFeatured: checkbox,
  })
  .refine((data) => data.mrp === null || data.mrp >= data.price, {
    message: "MRP can't be lower than the selling price.",
  });

/** "Material: Ceramic" lines → [["Material", "Ceramic"], …] (the shape product pages read). */
function parseSpecifications(text: string) {
  const rows: [string, string][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator <= 0) return { error: `Specification "${line.trim()}" needs the form "Label: Value".` };
    const label = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!label || !value) return { error: `Specification "${line.trim()}" needs the form "Label: Value".` };
    rows.push([label.slice(0, 60), value.slice(0, 200)]);
  }
  return { rows };
}

function parseImages(text: string) {
  const urls = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (urls.length > 12) return { error: "Add at most 12 images." };
  for (const url of urls) {
    const check = imageUrl.safeParse(url);
    if (!check.success) return { error: firstIssue(check.error) };
  }
  return { urls };
}

function refreshStorefront(...slugs: (string | undefined)[]) {
  revalidateTag("nav-categories");
  revalidateTag("products");
  revalidatePath("/");
  revalidatePath("/products");
  for (const slug of slugs) if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/products");
}

export async function saveProduct(
  productId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const data = parsed.data;

  const slug = slugify(data.slug || data.name);
  if (!slug) return { error: "Please enter a URL slug using letters or numbers." };

  const specs = parseSpecifications(data.specifications);
  if ("error" in specs) return { error: specs.error };
  const images = parseImages(data.images);
  if ("error" in images) return { error: images.error };

  const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
  if (!category) return { error: "That category no longer exists." };

  const fields = {
    name: data.name,
    slug,
    code: data.code,
    categoryId: data.categoryId,
    price: data.price,
    mrp: data.mrp,
    stock: data.stock,
    description: data.description,
    specifications: specs.rows.length > 0 ? specs.rows : undefined,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
  };

  let savedId: string;
  let previousSlug: string | undefined;

  try {
    savedId = await prisma.$transaction(async (tx) => {
      let id: string;
      if (productId) {
        const existing = await tx.product.findUnique({ where: { id: productId }, select: { slug: true } });
        if (!existing) throw new Error("NOT_FOUND");
        previousSlug = existing.slug;
        await tx.product.update({
          where: { id: productId },
          // Clearing all spec lines should clear the stored JSON too.
          data: { ...fields, specifications: specs.rows.length > 0 ? specs.rows : [] },
        });
        id = productId;
      } else {
        const created = await tx.product.create({ data: fields, select: { id: true } });
        id = created.id;
      }

      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.urls.length > 0) {
        await tx.productImage.createMany({
          data: images.urls.map((url, index) => ({ productId: id, url, alt: data.name, sortOrder: index })),
        });
      }
      return id;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return { error: "Product not found." };
    if (isUniqueViolation(error, "slug")) return { error: `Another product already uses the URL "${slug}".` };
    if (isUniqueViolation(error, "code")) return { error: `Another product already uses the code "${data.code}".` };
    throw error;
  }

  refreshStorefront(slug, previousSlug);

  if (!productId) redirect(`/admin/products/${savedId}?created=1`);
  return { success: "Product saved." };
}

export async function deleteProduct(productId: string): Promise<ActionState> {
  await requireAdmin();

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (!product) return { error: "Product not found." };

  // Order lines keep their own name and price, and their product link is set
  // to null by the database; cart items, images and reviews are removed.
  await prisma.product.delete({ where: { id: productId } });
  refreshStorefront(product.slug);
  redirect("/admin/products?deleted=1");
}
