import Image from "next/image";
import Link from "next/link";
import SmartImage from "../components/SmartImage";
import { prisma } from "../lib/prisma";
import { formatRupees } from "../lib/order-display";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl, jsonLd } from "../lib/site";
import { getBestSellers, getCatalogueStats, getNewArrivals } from "../lib/home";
import { getDeliveryRules } from "../lib/store-settings";
import { isOnlinePaymentConfigured } from "../lib/payments";
import HomeProductCard from "../components/home/HomeProductCard";
import TrustStrip from "../components/home/TrustStrip";
import "./home.css";

const HERO_IMAGE = "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=1600&q=70";
const B2B_IMAGE = "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=2200&q=85";

// Rebuilt every 10 minutes; admin product/category edits also refresh it
// immediately via revalidatePath("/").
export const revalidate = 600;

const FEATURED_LIMIT = 8;
const BEST_SELLER_LIMIT = 8;
const NEW_ARRIVAL_LIMIT = 4;
// Below this many real sellers the section is titled as picks, not best sellers.
const MIN_REAL_BEST_SELLERS = 4;

async function getHomeData() {
  const [categories, featured, newArrivals, stats, delivery] = await Promise.all([
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
    getNewArrivals(NEW_ARRIVAL_LIMIT),
    getCatalogueStats(),
    getDeliveryRules(),
  ]);
  // Fill-in picks skip what the featured and new-arrival rows already show.
  const bestSellers = await getBestSellers(BEST_SELLER_LIMIT, [
    ...featured.map((product) => product.slug),
    ...newArrivals.map((product) => product.slug),
  ]);
  return { categories, featured, newArrivals, bestSellers, stats, delivery };
}

export default async function Home() {
  const { categories, featured, newArrivals, bestSellers, stats, delivery } = await getHomeData();
  const realBestSellers = bestSellers.soldCount >= MIN_REAL_BEST_SELLERS;
  // Only real sellers carry the "Best Sellers" title; until then the row is our picks.
  const bestSellerProducts = realBestSellers
    ? // Whole rows of four, so the grid never ends on a lone card.
      bestSellers.products.slice(0, bestSellers.soldCount - (bestSellers.soldCount % 4))
    : bestSellers.products;
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
        <Image src={HERO_IMAGE} alt="" fill priority sizes="100vw" quality={70} className="hero-bg" />
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

      <TrustStrip delivery={delivery} onlinePayments={isOnlinePaymentConfigured()} />

      {/* BRAND STORY */}
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
            <p className="intro-lead">
              Crockery is the first thing guests notice and the last detail that
              completes a table. We think it deserves the same care as the food
              served on it.
            </p>

            <p>
              Aurelia brings together Indian ceramic craft and contemporary
              design. We obsess over proportion, glaze and edge profiles, the
              small details that make a plate feel right in the hand, and we
              choose pieces that hold up to daily use at home and in busy
              hospitality kitchens alike.
            </p>

            <Link href="/about" className="text-link">
              Read our story <span>→</span>
            </Link>
          </div>
        </div>

        <div className="container story-pillars">
          <div className="story-pillar">
            <span>01</span>
            <h3>Considered design</h3>
            <p>Clean, useful forms with the proportion and finish to look good on any table, for years.</p>
          </div>
          <div className="story-pillar">
            <span>02</span>
            <h3>Craft in every piece</h3>
            <p>From matte glazes to hand-painted Khurja pottery, where every brushstroke makes a piece its own.</p>
          </div>
          <div className="story-pillar">
            <span>03</span>
            <h3>Made to be used</h3>
            <p>Tableware for everyday meals, festive spreads and professional kitchens, not just the display cabinet.</p>
          </div>
          <div className="story-stats" aria-label="Our catalogue">
            <div>
              <strong>{stats.products}</strong>
              <span>designs</span>
            </div>
            <div>
              <strong>{stats.collections}</strong>
              <span>collections</span>
            </div>
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

      {/* BEST SELLERS */}
      {bestSellerProducts.length > 0 && (
        <section className="home-products section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="section-label">{realBestSellers ? "BEST SELLERS" : "OUR PICKS"}</p>
                <h2>
                  {realBestSellers ? (
                    <>
                      What our customers <em>love</em>
                    </>
                  ) : (
                    <>
                      Pieces worth a <em>closer look</em>
                    </>
                  )}
                </h2>
              </div>

              <Link href="/products?sort=popularity" className="text-link">
                Shop all {realBestSellers ? "best sellers" : "products"} <span>→</span>
              </Link>
            </div>

            <div className="home-card-grid">
              {bestSellerProducts.map((product) => (
                <HomeProductCard product={product} key={product.slug} />
              ))}
            </div>
          </div>
        </section>
      )}

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

      {/* NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section className="new-arrivals section">
          <div className="container new-arrivals-grid">
            <div className="new-arrivals-intro">
              <p className="section-label">JUST IN</p>
              <h2>
                New
                <br />
                <em>Arrivals</em>
              </h2>
              <p>Fresh pieces, just added to the collection.</p>
              <Link href="/products?sort=newest" className="primary-btn dark-btn">
                Shop New Arrivals <span>→</span>
              </Link>
            </div>

            <div className="home-card-grid new-arrivals-cards">
              {newArrivals.map((product) => (
                <HomeProductCard product={product} badge="New" key={product.slug} />
              ))}
            </div>
          </div>
        </section>
      )}

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
        <Image src={B2B_IMAGE} alt="" fill sizes="100vw" quality={65} className="section-bg" />
        <div className="b2b-overlay" />
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
