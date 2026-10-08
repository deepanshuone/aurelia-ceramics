import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../../lib/admin";
import { prisma } from "../../../../lib/prisma";
import ProductForm from "../ProductForm";

export const metadata: Metadata = { title: "Edit product" };

const yesNo = (value: boolean | null) => (value === null ? "" : value ? "yes" : "no");

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requirePermission("products", "view");
  const { id } = await params;
  const { created } = await searchParams;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
  ]);

  if (!product) notFound();

  const specifications = Array.isArray(product.specifications)
    ? (product.specifications as [string, string][]).map(([label, value]) => `${label}: ${value}`).join("\n")
    : "";

  return (
    <>
      <Link href="/admin/products" className="admin-link">
        ← All products
      </Link>
      <header className="admin-header">
        <h1>{product.name}</h1>
        {product.isActive && (
          <Link href={`/products/${product.slug}`} className="admin-link" target="_blank">
            View in store ↗
          </Link>
        )}
      </header>

      {created && <p className="admin-success">Product created.</p>}

      <ProductForm
        categories={categories}
        values={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          code: product.code,
          categoryId: product.categoryId,
          price: String(product.price),
          mrp: product.mrp ? String(product.mrp) : "",
          stock: String(product.stock),
          description: product.description ?? "",
          specifications,
          images: product.images.map((image) => image.url).join("\n"),
          details: {
            dimensions: product.dimensions ?? "",
            weight: product.weight ?? "",
            material: product.material ?? "",
            capacity: product.capacity ?? "",
            colour: product.colour ?? "",
            finish: product.finish ?? "",
            whatsIncluded: product.whatsIncluded ?? "",
            careInstructions: product.careInstructions ?? "",
            foodSafe: yesNo(product.foodSafe),
            microwaveSafe: yesNo(product.microwaveSafe),
            dishwasherSafe: yesNo(product.dishwasherSafe),
            returnable: product.returnable,
          },
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          orderCount: product._count.orderItems,
        }}
      />
    </>
  );
}
