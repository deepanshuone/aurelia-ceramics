import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import ProductPurchase from "./ProductPurchase";
import ProductGallery from "./ProductGallery";
import "./product-page.css";
import ProductCatalogue from "../../../components/ProductCatalogue";
import ReviewComposer from "./ReviewComposer";
import ReviewList from "./ReviewList";
import { reviewPhotoUrl, reviewerDisplayName } from "../../../lib/reviews";
import { formatOrderDate } from "../../../lib/order-display";
import { SITE_NAME, getSiteUrl, jsonLd } from "../../../lib/site";
import { POLICY, whatsappLink } from "../../../lib/business";
import { getDeliveryRules, getDisplayProcessingDays, getShowSampleRatings } from "../../../lib/store-settings";
import { shownRating } from "../../../lib/sample-ratings";
import { buildProductDetails } from "../../../lib/product-details";
import { estimateDelivery, formatDeliveryDate } from "../../../lib/delivery-estimate";

// cache(): generateMetadata and the page share one query per request.
const getProduct = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
    },
  });

  // Hidden products, or products in a hidden category, are not publicly viewable.
  if (!product || !product.isActive || !product.category.isActive) return null;

  return product;
});

// Served from Vercel's edge cache; refreshed every 10 minutes, and immediately
// when an admin edits the product or a review is posted (revalidatePath).
export const revalidate = 600;

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isActive: true, category: { isActive: true } },
    select: { slug: true },
  });
  return products.map((product) => ({ slug: product.slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const description =
    product.description ??
    `${product.name} - premium ceramic tableware from Aurelia Ceramics.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      images: product.images[0]?.url ? [{ url: product.images[0].url, alt: product.name }] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, delivery, processingDays, showSampleRatings] = await Promise.all([
    getProduct(slug),
    getDeliveryRules(),
    getDisplayProcessingDays(),
    getShowSampleRatings(),
  ]);

  if (!product) {
    notFound();
  }

  const price = Number(product.price);
  const mrp = product.mrp ? Number(product.mrp) : null;
  // The real average, or a sample rating while Admin → Settings allows it (no review count then).
  const { rating, isSample: isSampleRating } = shownRating(product, showSampleRatings);
  const discount =
    mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null;

  const details = buildProductDetails(product);
  const safeFlags = details.safety.filter((flag) => flag.value);

  const mainImage = product.images[0]?.url ?? "/placeholder-product.svg";
  const galleryImages =
    product.images.length > 0
      ? product.images.map((image, i) => ({
          url: image.url,
          alt: image.alt ? `${image.alt} — photo ${i + 1}` : `${product.name} — photo ${i + 1}`,
        }))
      : [{ url: mainImage, alt: product.name }];

  // Estimated from the store's processing time plus courier transit time. The
  // page is cached for up to 10 minutes, so the dates are at most that stale.
  const eta = estimateDelivery(processingDays);
  const freeDelivery = price >= delivery.freeDeliveryThreshold;

  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      isActive: true,
      NOT: { id: product.id },
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: [{ isFeatured: "desc" }, { reviewCount: "desc" }],
    take: 4,
  });

  // Public reviews. Whether *this* visitor may write one is checked in the
  // browser (ReviewComposer), so the page itself can be cached.
  const [reviews, verifiedCount, ratingGroups] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: { select: { name: true } },
        photos: { orderBy: { sortOrder: "asc" }, select: { id: true } },
      },
    }),
    prisma.review.count({ where: { productId: product.id, isVerifiedPurchase: true } }),
    prisma.review.groupBy({ by: ["rating"], where: { productId: product.id }, _count: true }),
  ]);
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratingGroups.find((group) => group.rating === star)?._count ?? 0,
  }));

  const whatsappHref = whatsappLink(
    `Hello, I am interested in ${product.name} (${product.code}). Please share product details and pricing.`
  );
  // Pre-fills the contact form so bulk enquiries arrive with the product attached.
  const bulkQuoteHref = `/contact?${new URLSearchParams({
    requirement: "Wholesale / Bulk order",
    product: `${product.name} (${product.code})`,
  })}`;

  // Structured data for rich results. aggregateRating is only emitted when the
  // product has real customer reviews.
  const site = getSiteUrl();
  const productUrl = `${site}/products/${product.slug}`;
  const absolute = (url: string) => (url.startsWith("/") ? `${site}${url}` : url);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      sku: product.code,
      description: product.description ?? undefined,
      category: product.category.name,
      image: product.images.map((image) => absolute(image.url)),
      brand: { "@type": "Brand", name: SITE_NAME },
      // Only real customer reviews are marked up as ratings, never sample ones.
      ...(rating !== null && !isSampleRating && product.reviewCount > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: rating.toFixed(1),
              reviewCount: product.reviewCount,
            },
          }
        : {}),
      offers: {
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "INR",
        price: price.toFixed(2),
        itemCondition: "https://schema.org/NewCondition",
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Products", item: `${site}/products` },
        {
          "@type": "ListItem",
          position: 3,
          name: product.category.name,
          item: `${site}/products?category=${encodeURIComponent(product.category.name)}`,
        },
        { "@type": "ListItem", position: 4, name: product.name, item: productUrl },
      ],
    },
  ];

  return (
    <main className="product-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      {/* BREADCRUMB */}
      <div className="product-breadcrumb">
        <div className="product-container">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/products">Products</Link>
          <span>/</span>
          <Link href={`/products?category=${encodeURIComponent(product.category.name)}`}>
            {product.category.name}
          </Link>
          <span>/</span>
          <strong>{product.name}</strong>
        </div>
      </div>

      {/* PRODUCT */}
      <section className="product-detail">
        <div className="product-container product-detail-grid">
          {/* PHOTOS */}
          <ProductGallery images={galleryImages} badge={discount !== null ? `${discount}% OFF` : null} />

          {/* INFORMATION */}
          <div className="product-detail-info">
            <p className="product-detail-category">{product.category.name}</p>

            <h1>{product.name}</h1>

            {rating !== null && (
              <div className="product-rating">
                <span>{"★".repeat(Math.round(rating))}</span>
                <a href="#reviews">
                  {rating.toFixed(1)}
                  {product.reviewCount > 0 &&
                    ` (${product.reviewCount} ${product.reviewCount === 1 ? "review" : "reviews"})`}
                </a>
              </div>
            )}

            <div className="product-code-large">
              PRODUCT CODE <span>{product.code}</span>
            </div>

            {/* PRICE */}
            <div className="product-pricing">
              <strong>₹{price.toLocaleString("en-IN")}</strong>

              {mrp && mrp > price && (
                <del>₹{mrp.toLocaleString("en-IN")}</del>
              )}

              {discount !== null && <span>{discount}% OFF</span>}
            </div>

            <p className="tax-note">Inclusive of applicable taxes</p>

            {safeFlags.length > 0 && (
              <ul className="pdp-badges" aria-label="Safe for">
                {safeFlags.map((flag) => (
                  <li key={flag.key}>✓ {flag.label}</li>
                ))}
              </ul>
            )}

            {/* STOCK */}
            <div className="stock-status">
              {product.stock > 0 ? (
                <>
                  <span />
                  {product.stock <= 5 ? `Only ${product.stock} left — order soon` : "In stock, ready to dispatch"}
                </>
              ) : (
                <strong className="out-of-stock">Out of Stock</strong>
              )}
            </div>

            <ProductPurchase
              product={{
                id: product.id,
                slug,
                name: product.name,
                price,
                image: mainImage,
                stock: product.stock,
              }}
            />

            {/* DELIVERY & RETURNS */}
            <div className="pdp-delivery">
              {product.stock > 0 && (
                <p>
                  <strong>
                    Estimated delivery: {formatDeliveryDate(eta.earliest)} – {formatDeliveryDate(eta.latest)}
                  </strong>
                  <span>
                    {freeDelivery
                      ? "Free delivery on this item"
                      : `Free delivery on orders of ₹${delivery.freeDeliveryThreshold.toLocaleString("en-IN")}+, otherwise ₹${delivery.deliveryFee.toLocaleString("en-IN")}`}
                  </span>
                </p>
              )}
              <p>
                <strong>{product.returnable ? `${POLICY.returnHours} hr return or replacement` : "Not returnable"}</strong>
                <span>
                  {product.returnable
                    ? `Unused items in original packaging can be returned or replaced within ${POLICY.returnHours} hours of delivery.`
                    : "This item can't be returned for a change of mind. Damage in transit is still covered."}{" "}
                  <Link href="/return-refund-policy">Policy</Link>
                </span>
              </p>
            </div>

            {/* WHY BUY */}
            <ul className="product-assurances">
              <li>
                <strong>Free delivery</strong>
                <span>On orders of ₹{delivery.freeDeliveryThreshold.toLocaleString("en-IN")} or more</span>
              </li>
              <li>
                <strong>Cash on Delivery</strong>
                <span>Pay when it arrives</span>
              </li>
              <li>
                <strong>Breakage covered</strong>
                <span>Report within {POLICY.damageReportHours} hrs for a free replacement</span>
              </li>
              <li>
                <strong>Secure checkout</strong>
                <span>UPI, cards &amp; net banking</span>
              </li>
            </ul>

            {/* B2B */}
            <div className="b2b-product-box">
              <div>
                <span>B2B / BULK BUYING</span>
                <h2>Buying for your business?</h2>
                <p>
                  Get special pricing for bulk quantities, hotels,
                  restaurants and distributors.
                </p>
              </div>

              <Link href={bulkQuoteHref}>Request Bulk Quote →</Link>
            </div>

            {/* DESCRIPTION */}
            {product.description && (
              <p className="product-description">{product.description}</p>
            )}

            {/* DETAILS: only what has been filled in for this product */}
            <div className="pdp-sections">
              {(details.build.length > 0 || details.other.length > 0) && (
                <details open>
                  <summary>Product details</summary>
                  <div className="specifications">
                    {[...details.build, ...details.other].map((row) => (
                      <div className="spec-row" key={row.label}>
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {details.included && (
                <details>
                  <summary>What&apos;s included</summary>
                  <p className="pdp-text">{details.included}</p>
                </details>
              )}

              {(details.safety.length > 0 || details.care) && (
                <details>
                  <summary>Care &amp; safety</summary>
                  {details.safety.length > 0 && (
                    <div className="specifications">
                      {details.safety.map((flag) => (
                        <div className="spec-row" key={flag.key}>
                          <span>{flag.label}</span>
                          <strong>{flag.value ? "Yes" : "No"}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  {details.care && <p className="pdp-text">{details.care}</p>}
                </details>
              )}

              <details>
                <summary>Delivery &amp; returns</summary>
                <ul className="pdp-text">
                  <li>
                    Packed and dispatched within {processingDays} {processingDays === 1 ? "day" : "days"}, then usually{" "}
                    {POLICY.deliveryDays} with the courier.
                  </li>
                  <li>
                    Free delivery on orders of ₹{delivery.freeDeliveryThreshold.toLocaleString("en-IN")} or more; ₹
                    {delivery.deliveryFee.toLocaleString("en-IN")} below that.
                  </li>
                  <li>
                    {product.returnable
                      ? `Return or replacement within ${POLICY.returnHours} hours of delivery if unused and in its original packaging.`
                      : "Not returnable for a change of mind."}{" "}
                    Anything damaged in transit is replaced free if reported within {POLICY.damageReportHours} hours.
                  </li>
                </ul>
                <p className="pdp-text">
                  <Link href="/shipping-policy">Shipping policy</Link> ·{" "}
                  <Link href="/return-refund-policy">Return &amp; refund policy</Link>
                </p>
              </details>
            </div>

            {/* WHATSAPP (shown once a number is set in lib/business.ts) */}
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="whatsapp-btn product-whatsapp">
                Enquire on WhatsApp <span>↗</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="product-reviews" id="reviews">
        <div className="product-container">
          <div className="reviews-head">
            <p className="section-label">CUSTOMER REVIEWS</p>
            <div className="reviews-summary">
              <div>
                <h2>
                  {rating !== null ? (
                    <>
                      <span className="reviews-score">{rating.toFixed(1)}</span>
                      <span className="reviews-stars" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
                        {"★".repeat(Math.round(rating))}
                        <span className="off">{"★".repeat(5 - Math.round(rating))}</span>
                      </span>
                    </>
                  ) : (
                    "No reviews yet"
                  )}
                </h2>
                <p className="reviews-sub">
                  {product.reviewCount > 0
                    ? `Based on ${product.reviewCount} ${product.reviewCount === 1 ? "review" : "reviews"}${
                        verifiedCount > 0 ? ` · ${verifiedCount} from verified buyers` : ""
                      }`
                    : "Bought this piece? Be the first to share how it looks on your table."}
                </p>
              </div>

              {product.reviewCount > 0 && (
                <ul className="rating-bars" aria-label="Rating breakdown">
                  {ratingCounts.map(({ star, count }) => (
                    <li key={star}>
                      <span>{star} ★</span>
                      <span className="rating-bar">
                        <span style={{ width: `${(count / product.reviewCount) * 100}%` }} />
                      </span>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="reviews-layout">
            <ReviewList
              reviews={reviews.map((review) => ({
                id: review.id,
                rating: review.rating,
                title: review.title,
                comment: review.comment,
                verified: review.isVerifiedPurchase,
                author: reviewerDisplayName(review.customer.name),
                date: formatOrderDate(review.createdAt),
                createdAt: review.createdAt.toISOString(),
                photos: review.photos.map((photo) => reviewPhotoUrl(photo.id)),
              }))}
            />

            <div className="reviews-aside">
              <ReviewComposer slug={product.slug} />
            </div>
          </div>
        </div>
      </section>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="catalogue">
          <div className="catalogue-container">
            <div className="catalogue-top">
              <div>
                <p className="catalogue-label">YOU MAY ALSO LIKE</p>
                <h2>Related Products</h2>
              </div>
            </div>

            <ProductCatalogue
              products={relatedProducts.map((related) => ({
                id: related.id,
                name: related.name,
                slug: related.slug,
                code: related.code,
                price: Number(related.price),
                mrp: related.mrp ? Number(related.mrp) : null,
                stock: related.stock,
                rating: shownRating(related, showSampleRatings).rating,
                reviewCount: related.reviewCount,
                category: { name: product.category.name },
                image: related.images[0]?.url ?? "/placeholder-product.svg",
              }))}
            />
          </div>
        </section>
      )}

      {/* PRODUCT STORY */}
      <section className="product-story">
        <div className="product-container product-story-grid">
          <p className="section-label">ABOUT THIS COLLECTION</p>

          <div>
            <h2>
              Designed with purpose,
              <br />
              <em>made for real tables.</em>
            </h2>

            <p>
              Our ceramic collections are developed with a balance of
              appearance, functionality and everyday usability.
            </p>

            <p>
              Contact our team for current availability, specifications,
              customization options and bulk pricing.
            </p>

            <Link href="/contact" className="text-link">
              Talk to our team <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* B2B CTA */}
      <section className="product-b2b">
        <div className="product-container">
          <p className="section-label">B2B & OEM</p>

          <h2>
            Need this product
            <br />
            <em>in bulk?</em>
          </h2>

          <p>
            Share your quantity, specifications and delivery requirements
            with our team.
          </p>

          <Link href="/contact" className="primary-btn">
            Send Bulk Enquiry <span>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
