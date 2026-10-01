import Link from "next/link";
import SmartImage from "../components/SmartImage";
import { prisma } from "../lib/prisma";
import { formatRupees } from "../lib/order-display";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl, jsonLd } from "../lib/site";

// Rebuilt every 10 minutes; admin product/category edits also refresh it
// immediately via revalidatePath("/").
export const revalidate = 600;

const FEATURED_LIMIT = 8;

async function getHomeData() {
  const [categories, featured] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, products: { some: { isActive: true } } },
      orderBy: { name: "asc" },
      select: {
        name: true,
        description: true,
        image: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true, category: { isActive: true } },
      orderBy: { createdAt: "desc" },
      take: FEATURED_LIMIT,
      select: {
        slug: true,
        name: true,
        price: true,
        mrp: true,
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
  ]);
  return { categories, featured };
}

export default async function Home() {
  const { categories, featured } = await getHomeData();
  const site = getSiteUrl();
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: site,
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: site,
      potentialAction: {
        "@type": "SearchAction",
        target: `${site}/products?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      {/* HERO */}
      <section className="hero">
        <div className="hero-overlay" />

        <div className="container hero-content">
          <p className="eyebrow">PREMIUM CERAMIC TABLEWARE</p>

          <h1>
            Crafted for the
            <br />
            <em>Art of Dining.</em>
          </h1>

          <p className="hero-description">
            Premium ceramic crockery designed for homes, hotels, restaurants,
            cafés and modern hospitality spaces.
          </p>

          <div className="hero-buttons">
            <Link href="/products" className="primary-btn">
              Explore Collection <span>→</span>
            </Link>

            <Link href="/contact" className="secondary-btn">
              Bulk Enquiry
            </Link>
          </div>
        </div>

        <div className="hero-scroll">
          <span />
          Scroll to explore
        </div>
      </section>

      {/* INTRO */}
      <section className="intro section">
        <div className="container intro-grid">
          <div>
            <p className="section-label">OUR PHILOSOPHY</p>
            <h2>
              Everyday objects,
              <br />
              <em>beautifully made.</em>
            </h2>
          </div>

          <div className="intro-text">
            <p>
              At Aurelia Ceramics, we believe crockery is more than something
              you eat from. It is part of the experience — the first thing
              guests notice and the final detail that completes a table.
            </p>

            <p>
              We combine timeless design, dependable ceramic quality and
              practical functionality to create tableware made for modern
              living and professional hospitality.
            </p>

            <Link href="/about" className="text-link">
              Discover our story <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="categories section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="section-label">EXPLORE</p>
              <h2>Our Collections</h2>
            </div>

            <Link href="/products" className="text-link">
              View all products <span>→</span>
            </Link>
          </div>

          <div className="category-tiles">
            {categories.map((category) => (
              <Link
                href={`/products?category=${encodeURIComponent(category.name)}`}
                className="category-tile"
                key={category.name}
              >
                <div className="category-tile-image">
                  <SmartImage
                    src={category.image ?? "/placeholder-product.svg"}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 45vw, (max-width: 1100px) 25vw, 180px"
                  />
                </div>
                <strong>{category.name}</strong>
                <span>
                  {category._count.products} {category._count.products === 1 ? "product" : "products"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="featured section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="section-label">SIGNATURE PIECES</p>
              <h2>Featured Collection</h2>
            </div>

            <Link href="/products" className="text-link">
              Browse collection <span>→</span>
            </Link>
          </div>

          <div className="product-grid featured-grid">
            {featured.map((product) => (
              <Link href={`/products/${product.slug}`} className="product-card" key={product.slug}>
                <div className="product-image">
                  <SmartImage
                    src={product.images[0]?.url ?? "/placeholder-product.svg"}
                    alt={product.name}
                    fill
                    sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw"
                  />
                  <span className="product-arrow">↗</span>
                </div>

                <div className="product-info">
                  <p>{product.category.name}</p>
                  <h3>{product.name}</h3>
                  <strong className="product-price">
                    {formatRupees(product.price)}
                    {product.mrp && Number(product.mrp) > Number(product.price) && (
                      <s>{formatRupees(product.mrp)}</s>
                    )}
                  </strong>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="why section">
        <div className="container">
          <div className="why-heading">
            <p className="section-label">WHY AURELIA</p>
            <h2>
              Quality you can see.
              <br />
              <em>Reliability you can trust.</em>
            </h2>
          </div>

          <div className="why-grid">
            <div className="why-item">
              <span>01</span>
              <h3>Premium Ceramic</h3>
              <p>
                Carefully developed ceramic tableware focused on finish,
                durability and everyday usability.
              </p>
            </div>

            <div className="why-item">
              <span>02</span>
              <h3>Consistent Quality</h3>
              <p>
                Reliable product quality and finishing for both retail and
                professional hospitality requirements.
              </p>
            </div>

            <div className="why-item">
              <span>03</span>
              <h3>Custom & OEM</h3>
              <p>
                Product development and customization options for brands,
                hotels, restaurants and distributors.
              </p>
            </div>

            <div className="why-item">
              <span>04</span>
              <h3>Bulk Supply</h3>
              <p>
                Structured solutions for large-volume requirements and
                recurring B2B orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* B2B */}
      <section className="b2b" id="b2b">
        <div className="container b2b-inner">
          <div>
            <p className="section-label">FOR BUSINESS</p>
            <h2>
              Tableware made for
              <br />
              <em>your business.</em>
            </h2>

            <p className="b2b-description">
              Looking for reliable ceramic crockery in bulk? We work with
              hotels, restaurants, cafés, retailers, distributors and
              hospitality businesses.
            </p>
          </div>

          <Link href="/contact" className="primary-btn light-btn">
            Discuss Your Requirement <span>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
