import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import ProductPurchase from "./ProductPurchase";
import SmartImage from "../../../components/SmartImage";
import ProductCatalogue from "../../../components/ProductCatalogue";
import ReviewForm from "./ReviewForm";
import { auth } from "../../../auth";
import { hasReceivedProduct, reviewerDisplayName } from "../../../lib/reviews";
import { formatOrderDate } from "../../../lib/order-display";
import { SITE_NAME, getSiteUrl, jsonLd } from "../../../lib/site";
import { POLICY, whatsappLink } from "../../../lib/business";

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
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const price = Number(product.price);
  const mrp = product.mrp ? Number(product.mrp) : null;
  const rating = product.rating ? Number(product.rating) : null;
  const discount =
    mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null;

  const specifications = Array.isArray(product.specifications)
    ? (product.specifications as [string, string][])
    : null;

  const mainImage = product.images[0]?.url ?? "/placeholder-product.svg";

  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      isActive: true,
      NOT: { id: product.id },
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { isFeatured: "desc" },
    take: 4,
  });

  // Reviews (verified buyers only) and whether this visitor may write one.
  const [reviews, session] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { customer: { select: { name: true } } },
    }),
    auth(),
  ]);
  const viewerId = session?.user?.id;
  const canReview = viewerId ? await hasReceivedProduct(viewerId, product.id) : false;
  const myReview =
    viewerId && canReview
      ? await prisma.review.findUnique({
          where: { productId_customerId: { productId: product.id, customerId: viewerId } },
          select: { rating: true, title: true, comment: true },
        })
      : null;

  const whatsappHref = whatsappLink(
    `Hello, I am interested in ${product.name} (${product.code}). Please share product details and pricing.`
  );
  // Pre-fills the contact form so bulk enquiries arrive with the product attached.
  const bulkQuoteHref = `/contact?${new URLSearchParams({
    requirement: "Wholesale / Bulk order",
    product: `${product.name} (${product.code})`,
  })}`;

  // Structured data for rich results. No aggregateRating: only verified
  // customer reviews should be marked up as ratings.
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
      // Only real, verified-buyer reviews are marked up as ratings.
      ...(rating !== null && product.reviewCount > 0
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
          {/* IMAGE */}
          <div className="product-detail-image">
            <SmartImage
              src={mainImage}
              alt={product.images[0]?.alt ?? product.name}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
            />

            {discount !== null && (
              <span className="product-discount">{discount}% OFF</span>
            )}
          </div>

          {/* INFORMATION */}
          <div className="product-detail-info">
            <p className="product-detail-category">{product.category.name}</p>

            <h1>{product.name}</h1>

            {rating !== null && (
              <div className="product-rating">
                <span>{"★".repeat(Math.round(rating))}</span>
                <a href="#reviews">
                  {rating.toFixed(1)} ({product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"})
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

            {/* WHY BUY */}
            <ul className="product-assurances">
              <li>
                <strong>Free delivery</strong>
                <span>On orders above ₹{POLICY.freeDeliveryThreshold.toLocaleString("en-IN")}</span>
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
                <h3>Buying for your business?</h3>
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

            {/* SPECIFICATIONS */}
            {specifications && (
              <div className="specifications">
                <h2>Product Information</h2>

                {specifications.map(([label, value]) => (
                  <div className="spec-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            )}

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
            <h2>
              {rating !== null ? (
                <>
                  <span className="reviews-stars" aria-hidden="true">
                    {"\u2605".repeat(Math.round(rating))}
                    <span className="off">{"\u2605".repeat(5 - Math.round(rating))}</span>
                  </span>{" "}
                  {rating.toFixed(1)} out of 5
                </>
              ) : (
                "No reviews yet"
              )}
            </h2>
            <p className="reviews-sub">
              {product.reviewCount > 0
                ? `Based on ${product.reviewCount} verified ${product.reviewCount === 1 ? "purchase" : "purchases"}`
                : "Reviews are written only by customers who received this product."}
            </p>
          </div>

          <div className="reviews-layout">
            <ul className="reviews-list">
              {reviews.map((review) => (
                <li key={review.id}>
                  <div className="review-meta">
                    <span className="reviews-stars small" aria-label={`${review.rating} out of 5 stars`}>
                      {"\u2605".repeat(review.rating)}
                      <span className="off">{"\u2605".repeat(5 - review.rating)}</span>
                    </span>
                    {review.isVerifiedPurchase && <span className="verified-badge">Verified buyer</span>}
                  </div>
                  {review.title && <h3>{review.title}</h3>}
                  {review.comment && <p>{review.comment}</p>}
                  <small>
                    {reviewerDisplayName(review.customer.name)} &middot; {formatOrderDate(review.createdAt)}
                  </small>
                </li>
              ))}
            </ul>

            <div className="reviews-aside">
              {canReview ? (
                <ReviewForm
                  slug={product.slug}
                  existing={
                    myReview
                      ? { rating: myReview.rating, title: myReview.title ?? "", comment: myReview.comment ?? "" }
                      : null
                  }
                />
              ) : (
                <p className="reviews-note">
                  {viewerId ? (
                    "You can review this product once your order has been delivered."
                  ) : (
                    <>
                      Bought this? <Link href={`/login?callbackUrl=/products/${product.slug}`}>Log in</Link> after
                      delivery to share your review.
                    </>
                  )}
                </p>
              )}
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
                rating: null,
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
