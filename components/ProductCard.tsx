import Link from 'next/link';

export default function ProductCard({ slug, name, category, tone='sand', code }: {slug:string;name:string;category:string;tone?:string;code:string}) {
 return <Link href={`/products/${slug}`} className="product-card">
   <div className={`product-art ${tone}`}><div className="plate"><div className="inner-plate"><span>{code}</span></div></div></div>
   <div className="product-info"><div><span className="eyebrow">{category}</span><h3>{name}</h3></div><span className="arrow">↗</span></div>
 </Link>
}
