import Link from "next/link";
import SmartImage from "./SmartImage";
import QuickAddButton from "./QuickAddButton";
import StarRating from "./home/StarRating";
import { discountPercent } from "../lib/pricing";

type Product = {
  id: string;
  name: string;
  slug: string;
  code: string;
  price: number;
  mrp: number | null;
  stock: number;
  /** Real average, or a sample rating (lib/sample-ratings.ts); null shows no stars. */
  rating: number | null;
  /** Number of real reviews; 0 or missing hides the count. */
  reviewCount?: number;
  category: { name: string };
  image: string;
  /** Optional highlight under the price, e.g. "Gets you FREE delivery". */
  note?: string;
};

type Props = {
  products: Product[];
};

export default function ProductCatalogue({ products }: Props) {
  return (
    <div className="catalogue-grid">
      {products.map((product) => {
        const off = discountPercent(product);
        return (
        <article className="catalogue-card" key={product.slug}>
          <Link href={`/products/${product.slug}`}>
            <div className="catalogue-image">
              <SmartImage src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw" />

              {product.stock <= 0 ? (
                <span className="catalogue-stock-badge">Out of Stock</span>
              ) : (
                off > 0 && <span className="catalogue-discount-badge">{off}% OFF</span>
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
            {off > 0 && product.mrp && (
              <>
                <del>₹{product.mrp.toLocaleString("en-IN")}</del>
                <span className="catalogue-off">{off}% off</span>
              </>
            )}
          </div>

          {product.rating !== null && <StarRating rating={product.rating} count={product.reviewCount || undefined} />}

          {product.note && <p className="catalogue-note">{product.note}</p>}

          <div className="catalogue-actions">
            <QuickAddButton slug={product.slug} name={product.name} inStock={product.stock > 0} />
            <Link href={`/products/${product.slug}`} className="view-product">
              Details <span>→</span>
            </Link>
          </div>
        </article>
        );
      })}
    </div>
  );
}
