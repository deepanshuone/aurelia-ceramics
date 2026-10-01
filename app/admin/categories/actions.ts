"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type ActionState,
  checkbox,
  firstIssue,
  isUniqueViolation,
  optionalText,
  requireAdmin,
  slugify,
} from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  slug: z.string().trim().max(80),
  description: optionalText(500),
  image: optionalText(500).refine(
    (value) => value === null || /^https:\/\/\S+$/i.test(value) || /^\/[\w\-./]+$/.test(value),
    "Image URL must start with https:// or /."
  ),
  isActive: checkbox,
});

function refresh() {
  revalidateTag("nav-categories");
  revalidateTag("products");
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function saveCategory(
  categoryId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!slug) return { error: "Please enter a URL slug using letters or numbers." };

  const data = { ...parsed.data, slug };

  try {
    if (categoryId) {
      await prisma.category.update({ where: { id: categoryId }, data });
    } else {
      await prisma.category.create({ data });
    }
  } catch (error) {
    if (isUniqueViolation(error, "slug")) return { error: `Another category already uses the URL "${slug}".` };
    throw error;
  }

  refresh();
  if (!categoryId) return { success: `Category “${data.name}” created.` };
  return { success: "Category saved." };
}

export async function deleteCategory(categoryId: string): Promise<ActionState> {
  await requireAdmin();

  const count = await prisma.product.count({ where: { categoryId } });
  if (count > 0) {
    return { error: `This category still has ${count} product${count === 1 ? "" : "s"}. Move or delete them first, or untick “Visible in store”.` };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  refresh();
  redirect("/admin/categories");
}
