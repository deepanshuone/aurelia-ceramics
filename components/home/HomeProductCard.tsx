import Link from "next/link";
import SmartImage from "../SmartImage";
import QuickAddButton from "../QuickAddButton";
import QuickViewButton from "./QuickViewButton";
import StarRating from "./StarRating";
import { formatRupees } from "../../lib/order-display";
import { discountPercent } from "./discount";
import type { HomeProduct } from "../../lib/home";

/** Homepage product card: photo, rating, price, discount, Add to cart and Quick View. */
export default function HomeProductCard({ product, badge }: { product: HomeProduct; badge?: string }) {
  const off = discountPercent(product);
  return (
    <article className="home-card">
      <div className="home-card-image">
        <Link href={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true">
          <SmartImage
            src={product.images[0] ?? "/placeholder-product.svg"}
            alt=""
            fill
            sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw"
          />
        </Link>
        <div className="home-card-badges">
          {badge && <span className="home-badge home-badge-new">{badge}</span>}
          {off > 0 && <span className="home-badge">{off}% OFF</span>}
        </div>
        <QuickViewButton product={product} />
      </div>

      <div className="home-card-info">
        <p>{product.category}</p>
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.rating !== null && <StarRating rating={product.rating} count={product.reviewCount || undefined} />}
        <div className="home-card-price">
          <strong>{formatRupees(product.price)}</strong>
          {off > 0 && product.mrp && <s>{formatRupees(product.mrp)}</s>}
        </div>
      </div>

      <div className="home-card-actions">
        <QuickAddButton slug={product.slug} name={product.name} inStock={product.stock > 0} />
      </div>
    </article>
  );
}
