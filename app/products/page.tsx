import { prisma } from "../../lib/prisma";
import ProductCatalogue from "../../components/ProductCatalogue";

const imageMap: Record<string, string> = {
  "ivory-dinner-collection":
    "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=1000&q=85",

  "classic-white-plate":
    "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=1000&q=85",

  "stone-ceramic-bowl":
    "https://images.unsplash.com/photo-1584269600519-112d071b35f4?auto=format&fit=crop&w=1000&q=85",

  "heritage-coffee-mug":
    "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=85",

  "modern-serving-collection":
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=85",

  "hospitality-whiteware":
    "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1000&q=85",
};

const categories = [
  "All Products",
  "Dinner Sets",
  "Plates",
  "Bowls",
  "Cups & Mugs",
  "Serving Ware",
  "Hotel & Restaurant",
];

export default async function ProductsPage() {
const dbProducts = await prisma.product.findMany({
  where: {
    isActive: true,
  },
  include: {
    category: true,
  },
  orderBy: {
    createdAt: "desc",
  },
});

const products = dbProducts.map((product) => ({
  ...product,
  price: Number(product.price),
  mrp: product.mrp ? Number(product.mrp) : null,
  rating: product.rating ? Number(product.rating) : null,
}));

  return (
    <main className="products-page">
      {/* HEADER */}
      <section className="products-hero">
        <div className="products-hero-overlay" />

        <div className="products-hero-content">
          <p>OUR COLLECTION</p>

          <h1>
            Ceramic tableware
            <br />
            <em>made to impress.</em>
          </h1>

          <span>
            Explore our collection of thoughtfully designed ceramic crockery
            for homes, hospitality and business.
          </span>
        </div>
      </section>

      {/* CATALOGUE */}
      <section className="catalogue">
        <div className="catalogue-container">
          <div className="catalogue-top">
            <div>
              <p className="catalogue-label">COLLECTIONS</p>
              <h2>Explore Products</h2>
            </div>

            <p className="product-count">
              {products.length} Products
            </p>
          </div>

          <ProductCatalogue
            products={products}
            imageMap={imageMap}
            categories={categories}
          />
        </div>
      </section>
    </main>
  );
}