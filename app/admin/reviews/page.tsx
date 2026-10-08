import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, parsePage, requirePermission } from "../../../lib/admin";
import { formatOrderDate } from "../../../lib/order-display";
import { prisma } from "../../../lib/prisma";
import Pagination from "../../../components/admin/Pagination";
import DeleteReviewButton from "./DeleteReviewButton";
import RemovePhotoButton from "./RemovePhotoButton";
import { reviewPhotoUrl } from "../../../lib/reviews";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("reviews", "view");
  const params = await searchParams;

  const total = await prisma.review.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      product: { select: { name: true, slug: true } },
      customer: { select: { id: true, name: true, email: true } },
      photos: { orderBy: { sortOrder: "asc" }, select: { id: true } },
    },
  });

  return (
    <>
      <header className="admin-header">
        <h1>Reviews</h1>
        <span className="admin-count">{total} total</span>
      </header>

      <section className="admin-panel">
        {reviews.length === 0 ? (
          <p className="admin-empty">No reviews yet. Signed-in customers can review any product; those who received it get a “Verified buyer” label.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td style={{ whiteSpace: "nowrap", color: "#b8860b" }}>
                      {"★".repeat(review.rating)}
                      <span style={{ color: "#ddd" }}>{"★".repeat(5 - review.rating)}</span>
                    </td>
                    <td>
                      {review.title && <strong>{review.title}</strong>}
                      {review.comment && <small>{review.comment.slice(0, 200)}</small>}
                      {review.photos.length > 0 && (
                        <div className="admin-review-photos">
                          {review.photos.map((photo) => (
                            <RemovePhotoButton key={photo.id} photoId={photo.id} url={reviewPhotoUrl(photo.id)} />
                          ))}
                        </div>
                      )}
                      <small>
                        {formatOrderDate(review.createdAt)}
                        {review.isVerifiedPurchase && " · Verified buyer"}
                      </small>
                    </td>
                    <td>
                      <Link href={`/products/${review.product.slug}#reviews`} target="_blank">
                        {review.product.name}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/customers/${review.customer.id}`}>{review.customer.name}</Link>
                      <small>{review.customer.email}</small>
                    </td>
                    <td className="num">
                      <DeleteReviewButton reviewId={review.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination basePath="/admin/reviews" params={{}} page={page} totalPages={totalPages} />
    </>
  );
}
