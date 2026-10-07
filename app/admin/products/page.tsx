import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, parsePage, requireStaff } from "../../../lib/admin";
import type { Prisma } from "../../../lib/generated/prisma/client";
import { formatRupees } from "../../../lib/order-display";
import { prisma } from "../../../lib/prisma";
import Pagination from "../../../components/admin/Pagination";
import DeleteProductButton from "./DeleteProductButton";

export const metadata: Metadata = { title: "Products" };

const LOW_STOCK = 5;

type Search = {
  q?: string;
  category?: string;
  stock?: string;
  visibility?: string;
  page?: string;
  deleted?: string;
};

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const where: Prisma.ProductWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.category ? { categoryId: params.category } : {}),
    ...(params.stock === "low" ? { stock: { lte: LOW_STOCK } } : {}),
    ...(params.visibility === "hidden"
      ? { isActive: false }
      : params.visibility === "visible"
        ? { isActive: true }
        : {}),
  };

  const [total, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy: params.stock === "low" ? { stock: "asc" } : { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      code: true,
      price: true,
      stock: true,
      isActive: true,
      isFeatured: true,
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  return (
    <>
      <header className="admin-header">
        <h1>Products</h1>
        <span className="admin-count">{total} total</span>
        <Link href="/admin/products/new" className="admin-btn">
          + New product
        </Link>
      </header>

      {params.deleted && <p className="admin-success">Product deleted.</p>}

      <form className="admin-filters" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Name or code" aria-label="Search products" />
        <select name="category" defaultValue={params.category ?? ""} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select name="stock" defaultValue={params.stock ?? ""} aria-label="Stock">
          <option value="">Any stock</option>
          <option value="low">Low stock (≤ {LOW_STOCK})</option>
        </select>
        <select name="visibility" defaultValue={params.visibility ?? ""} aria-label="Visibility">
          <option value="">Visible &amp; hidden</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>
        <button type="submit" className="admin-btn">
          Filter
        </button>
        {(q || params.category || params.stock || params.visibility) && (
          <Link href="/admin/products" className="admin-link">
            Clear
          </Link>
        )}
      </form>

      <section className="admin-panel">
        {products.length === 0 ? (
          <p className="admin-empty">No products match these filters.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th aria-label="Image" />
                  <th>Product</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Visibility</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img
                        className="admin-thumb"
                        src={product.images[0]?.url ?? "/placeholder-product.svg"}
                        alt=""
                      />
                    </td>
                    <td>
                      <Link href={`/admin/products/${product.id}`}>{product.name}</Link>
                      <small>{product.code}</small>
                    </td>
                    <td>{product.category.name}</td>
                    <td className="num">{formatRupees(product.price)}</td>
                    <td className={`num${product.stock <= LOW_STOCK ? " text-danger" : ""}`}>{product.stock}</td>
                    <td>
                      <span className={`admin-badge ${product.isActive ? "on" : "off"}`}>
                        {product.isActive ? "Visible" : "Hidden"}
                      </span>
                      {product.isFeatured && <small>Featured</small>}
                    </td>
                    <td className="num">
                      <Link href={`/admin/products/${product.id}`} className="admin-btn secondary small">
                        Edit
                      </Link>{" "}
                      <DeleteProductButton productId={product.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination
        basePath="/admin/products"
        params={{ q, category: params.category, stock: params.stock, visibility: params.visibility }}
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
