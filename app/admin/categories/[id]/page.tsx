import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin";
import { prisma } from "../../../../lib/prisma";
import CategoryForm from "../CategoryForm";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) notFound();

  return (
    <>
      <Link href="/admin/categories" className="admin-link">
        ← All categories
      </Link>
      <header className="admin-header">
        <h1>{category.name}</h1>
      </header>

      <CategoryForm
        values={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          image: category.image ?? "",
          isActive: category.isActive,
          productCount: category._count.products,
        }}
      />
    </>
  );
}
