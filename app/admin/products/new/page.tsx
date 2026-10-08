import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "../../../../lib/admin";
import { prisma } from "../../../../lib/prisma";
import ProductForm from "../ProductForm";
import { EMPTY_DETAILS } from "../detail-values";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requirePermission("products", "edit");
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
            details: EMPTY_DETAILS,
            isActive: true,
            isFeatured: false,
            orderCount: 0,
          }}
        />
      )}
    </>
  );
}
