import Link from "next/link";
import ProductPurchase from "./ProductPurchase";
const productData: Record<string, any> = {
    "ivory-dinner-collection": {
        name: "Ivory Dinner Collection",
        category: "Dinner Sets",
        code: "AC-DS-001",
        price: 1499,
        mrp: 1999,
        discount: 25,
        stock: 24,
        image:
            "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=1400&q=90",
        description:
            "A timeless ceramic dinner collection designed for elegant everyday dining, hospitality spaces and premium table settings.",
        specifications: [
            ["Material", "Ceramic"],
            ["Finish", "Ivory"],
            ["Pieces", "16 Pieces"],
            ["Usage", "Dining / Hospitality"],
            ["Customization", "Available"],
        ],
    },

    "classic-white-plate": {
        name: "Classic White Plate",
        category: "Plates",
        code: "AC-PL-001",
        price: 299,
        mrp: 399,
        discount: 25,
        stock: 85,
        image:
            "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=1400&q=90",
        description:
            "A versatile ceramic plate with a clean profile, designed for restaurants, hotels and modern dining environments.",
        specifications: [
            ["Material", "Ceramic"],
            ["Finish", "Classic White"],
            ["Size", "10 Inch"],
            ["Usage", "Dining / Food Service"],
            ["Customization", "Available"],
        ],
    },

    "stone-ceramic-bowl": {
        name: "Stone Ceramic Bowl",
        category: "Bowls",
        code: "AC-BL-001",
        price: 349,
        mrp: 449,
        discount: 22,
        stock: 42,
        image:
            "https://images.unsplash.com/photo-1584269600519-112d071b35f4?auto=format&fit=crop&w=1400&q=90",
        description:
            "A contemporary ceramic bowl featuring a natural stone-inspired aesthetic for modern dining.",
        specifications: [
            ["Material", "Ceramic"],
            ["Finish", "Stone Inspired"],
            ["Size", "7 Inch"],
            ["Usage", "Dining / Serving"],
            ["Customization", "Available"],
        ],
    },

    "heritage-coffee-mug": {
        name: "Heritage Coffee Mug",
        category: "Cups & Mugs",
        code: "AC-CM-001",
        price: 249,
        mrp: 329,
        discount: 24,
        stock: 65,
        image:
            "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1400&q=90",
        description:
            "A comfortable ceramic mug designed for coffee, tea and everyday beverage service.",
        specifications: [
            ["Material", "Ceramic"],
            ["Finish", "Glazed"],
            ["Capacity", "350 ml"],
            ["Usage", "Coffee / Tea"],
            ["Customization", "Available"],
        ],
    },

    "modern-serving-collection": {
        name: "Modern Serving Collection",
        category: "Serving Ware",
        code: "AC-SW-001",
        price: 899,
        mrp: 1199,
        discount: 25,
        stock: 18,
        image:
            "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1400&q=90",
        description:
            "Contemporary ceramic serving pieces created for elegant presentation and professional food service.",
        specifications: [
            ["Material", "Ceramic"],
            ["Finish", "Contemporary"],
            ["Pieces", "5 Pieces"],
            ["Usage", "Serving / Hospitality"],
            ["Customization", "Available"],
        ],
    },

    "hospitality-whiteware": {
        name: "Hospitality Whiteware",
        category: "Hotel & Restaurant",
        code: "AC-HR-001",
        price: 599,
        mrp: 799,
        discount: 25,
        stock: 120,
        image:
            "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1400&q=90",
        description:
            "Professional ceramic tableware solutions designed for hotels, restaurants and large-volume hospitality requirements.",
        specifications: [
            ["Material", "Ceramic"],
            ["Finish", "White"],
            ["Usage", "Hotel / Restaurant"],
            ["MOQ", "50 Pieces"],
            ["Customization", "Available"],
        ],
    },
};

export default async function ProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = productData[slug];

    if (!product) {
        return (
            <main className="product-not-found">
                <p>PRODUCT NOT FOUND</p>

                <h1>
                    We couldn't find
                    <br />
                    this product.
                </h1>

                <Link href="/products" className="primary-btn">
                    Back to Products <span>→</span>
                </Link>
            </main>
        );
    }

    const whatsappMessage = encodeURIComponent(
        `Hello, I am interested in ${product.name} (${product.code}). Please share product details and pricing.`
    );

    return (
        <main className="product-detail-page">
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
                        <img src={product.image} alt={product.name} />

                        <span className="product-discount">
                            {product.discount}% OFF
                        </span>
                    </div>

                    {/* INFORMATION */}

                    <div className="product-detail-info">
                        <p className="product-detail-category">
                            {product.category}
                        </p>

                        <h1>{product.name}</h1>

                        <div className="product-rating">
                            <span>★★★★★</span>
                            <small>4.8 (24 reviews)</small>
                        </div>

                        <div className="product-code-large">
                            PRODUCT CODE <span>{product.code}</span>
                        </div>

                        {/* PRICE */}

                        <div className="product-pricing">
                            <strong>₹{product.price.toLocaleString("en-IN")}</strong>

                            <del>₹{product.mrp.toLocaleString("en-IN")}</del>

                            <span>{product.discount}% OFF</span>
                        </div>

                        <p className="tax-note">
                            Inclusive of applicable taxes
                        </p>

                        {/* STOCK */}

                        <div className="stock-status">
                            <span />
                            In Stock — {product.stock} units available
                        </div>

                        <ProductPurchase
                            product={{
                                slug,
                                name: product.name,
                                price: product.price,
                                image: product.image,
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

                            <Link href="/contact">
                                Request Bulk Quote →
                            </Link>
                        </div>

                        {/* DESCRIPTION */}

                        <p className="product-description">
                            {product.description}
                        </p>

                        {/* SPECIFICATIONS */}

                        <div className="specifications">
                            <h2>Product Information</h2>

                            {product.specifications.map(
                                ([label, value]: string[]) => (
                                    <div className="spec-row" key={label}>
                                        <span>{label}</span>
                                        <strong>{value}</strong>
                                    </div>
                                )
                            )}
                        </div>

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