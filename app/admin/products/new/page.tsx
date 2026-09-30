import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "../../../../lib/admin";
import { prisma } from "../../../../lib/prisma";
import ProductForm from "../ProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });

  return (
    <>
      <Link href="/admin/products" className="admin-link">
        ← All products
      </Link>
      <header className="admin-header">
        <h1>New product</h1>
      </header>

      {categories.length === 0 ? (
        <p className="admin-panel admin-empty">
          Create a <Link href="/admin/categories">category</Link> first.
        </p>
      ) : (
        <ProductForm
          categories={categories}
          values={{
            id: null,
            name: "",
            slug: "",
            code: "",
            categoryId: "",
            price: "",
            mrp: "",
            stock: "0",
            description: "",
            specifications: "",
            images: "",
            isActive: true,
            isFeatured: false,
            orderCount: 0,
          }}
        />
      )}
    </>
  );
}
