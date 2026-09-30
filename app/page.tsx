import Link from "next/link";
import SmartImage from "../components/SmartImage";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl, jsonLd } from "../lib/site";

const categories = [
  {
    name: "Dinner Sets",
    description: "Complete tableware collections for modern dining.",
    image:
      "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Plates",
    description: "Elegant ceramic plates for everyday and premium dining.",
    image:
      "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Bowls",
    description: "Functional shapes crafted for beautiful presentation.",
    image:
      "https://images.unsplash.com/photo-1523367438061-01c055ce790c?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Cups & Mugs",
    description: "Premium ceramic drinkware for homes and businesses.",
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Serving Ware",
    description: "Designed to make every serving look exceptional.",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Hotel & Restaurant",
    description: "Durable crockery solutions for hospitality businesses.",
    image:
      "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=900&q=85",
  },
];

const products = [
  {
    name: "Ivory Dinner Collection",
    category: "Dinner Set",
    image:
      "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Classic White Plate",
    category: "Tableware",
    image:
      "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Stone Ceramic Bowl",
    category: "Bowls",
    image:
      "https://images.unsplash.com/photo-1523367438061-01c055ce790c?auto=format&fit=crop&w=900&q=85",
  },
];

export default function Home() {
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

          <div className="category-grid">
            {categories.map((category) => (
              <Link
                href={`/products?category=${encodeURIComponent(category.name)}`}
                className="category-card"
                key={category.name}
              >
                <SmartImage src={category.image} alt={category.name} fill sizes="(max-width: 700px) 100vw, 33vw" />

                <div className="category-overlay" />

                <div className="category-content">
                  <p>{category.name}</p>
                  <span>{category.description}</span>
                  <b>Explore →</b>
                </div>
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

          <div className="product-grid">
            {products.map((product) => (
              <Link href="/products" className="product-card" key={product.name}>
                <div className="product-image">
                  <SmartImage src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw" />
                  <span className="product-arrow">↗</span>
                </div>

                <div className="product-info">
                  <p>{product.category}</p>
                  <h3>{product.name}</h3>
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
