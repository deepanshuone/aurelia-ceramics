import Link from "next/link";
import SmartImage from "./SmartImage";

type Product = {
  id: string;
  name: string;
  slug: string;
  code: string;
  price: number;
  mrp: number | null;
  stock: number;
  rating: number | null;
  category: { name: string };
  image: string;
};

type Props = {
  products: Product[];
};

export default function ProductCatalogue({ products }: Props) {
  return (
    <div className="catalogue-grid">
      {products.map((product) => (
        <article className="catalogue-card" key={product.slug}>
          <Link href={`/products/${product.slug}`}>
            <div className="catalogue-image">
              <SmartImage src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw" />

              {product.stock <= 0 && (
                <span className="catalogue-stock-badge">Out of Stock</span>
              )}

              <span className="catalogue-arrow">↗</span>
            </div>
          </Link>

          <div className="catalogue-info">
            <div>
              <p>{product.category.name}</p>
              <h3>{product.name}</h3>
            </div>

            <span className="product-code">{product.code}</span>
          </div>

          <div className="catalogue-price">
            <strong>₹{product.price.toLocaleString("en-IN")}</strong>
            {product.mrp && product.mrp > product.price && (
              <del>₹{product.mrp.toLocaleString("en-IN")}</del>
            )}
          </div>

          <Link href={`/products/${product.slug}`} className="view-product">
            View Product <span>→</span>
          </Link>
        </article>
      ))}
    </div>
  );
}
