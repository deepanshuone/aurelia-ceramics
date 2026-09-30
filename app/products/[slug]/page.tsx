import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import ProductPurchase from "./ProductPurchase";
import SmartImage from "../../../components/SmartImage";
import { SITE_NAME, getSiteUrl, jsonLd } from "../../../lib/site";

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
    take: 4,
  });

  const whatsappMessage = encodeURIComponent(
    `Hello, I am interested in ${product.name} (${product.code}). Please share product details and pricing.`
  );

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
                <small>
                  {rating.toFixed(1)} ({product.reviewCount} reviews)
                </small>
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
                  {product.stock <= 5
                    ? `Only ${product.stock} left in stock`
                    : `In Stock — ${product.stock} units available`}
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

              <Link href="/contact">Request Bulk Quote →</Link>
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

            {/* WHATSAPP */}
            <a
              href={`https://wa.me/910000000000?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn product-whatsapp"
            >
              Enquire on WhatsApp <span>↗</span>
            </a>
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

            <div className="catalogue-grid">
              {relatedProducts.map((related) => (
                <article className="catalogue-card" key={related.slug}>
                  <Link href={`/products/${related.slug}`}>
                    <div className="catalogue-image">
                      <SmartImage
                        src={related.images[0]?.url ?? "/placeholder-product.svg"}
                        alt={related.name}
                        fill
                        sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw"
                      />
                      <span className="catalogue-arrow">↗</span>
                    </div>
                  </Link>

                  <div className="catalogue-info">
                    <div>
                      <p>{product.category.name}</p>
                      <h3>{related.name}</h3>
                    </div>
                    <span className="product-code">{related.code}</span>
                  </div>

                  <Link
                    href={`/products/${related.slug}`}
                    className="view-product"
                  >
                    View Product <span>→</span>
                  </Link>
                </article>
              ))}
            </div>
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
