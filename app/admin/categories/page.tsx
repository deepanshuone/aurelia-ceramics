import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";
import CategoryForm from "./CategoryForm";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <>
      <header className="admin-header">
        <h1>Categories</h1>
        <span className="admin-count">{categories.length} total</span>
      </header>

      <section className="admin-panel">
        {categories.length === 0 ? (
          <p className="admin-empty">No categories yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Products</th>
                  <th>Visibility</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <Link href={`/admin/categories/${category.id}`}>{category.name}</Link>
                      <small>/{category.slug}</small>
                    </td>
                    <td className="num">
                      <Link href={`/admin/products?category=${category.id}`}>{category._count.products}</Link>
                    </td>
                    <td>
                      <span className={`admin-badge ${category.isActive ? "on" : "off"}`}>
                        {category.isActive ? "Visible" : "Hidden"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CategoryForm
        values={{ id: null, name: "", slug: "", description: "", image: "", isActive: true, productCount: 0 }}
      />
    </>
  );
}
