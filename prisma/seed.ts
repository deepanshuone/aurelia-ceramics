import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { moreProducts, newCategoryDescriptions, type SeedProduct } from "./catalog";
import { khurjaCategoryDescriptions, khurjaRangeProducts } from "./catalog-khurja";
const prisma = new PrismaClient();

const products = [
  {
    name: "Ivory Dinner Collection",
    slug: "ivory-dinner-collection",
    code: "AC-DS-001",
    category: "Dinner Sets",
    price: 2499,
    mrp: 2999,
    stock: 25,
    rating: 4.8,
    reviewCount: 24,
    isFeatured: true,
    description:
      "A timeless ceramic dinner collection designed for elegant everyday dining, hospitality spaces and premium table settings.",
    image:
      "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=1400&q=90",
    specifications: [
      ["Material", "Ceramic"],
      ["Finish", "Ivory"],
      ["Pieces", "16 Pieces"],
      ["Usage", "Dining / Hospitality"],
      ["Customization", "Available"],
    ],
  },
  {
    name: "Classic White Plate",
    slug: "classic-white-plate",
    code: "AC-PL-001",
    category: "Plates",
    price: 399,
    mrp: 499,
    stock: 50,
    rating: 4.7,
    reviewCount: 41,
    isFeatured: true,
    description:
      "A versatile ceramic plate with a clean profile, designed for restaurants, hotels and modern dining environments.",
    image:
      "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=1400&q=90",
    specifications: [
      ["Material", "Ceramic"],
      ["Finish", "Classic White"],
      ["Size", "10 Inch"],
      ["Usage", "Dining / Food Service"],
      ["Customization", "Available"],
    ],
  },
  {
    name: "Stone Ceramic Bowl",
    slug: "stone-ceramic-bowl",
    code: "AC-BL-001",
    category: "Bowls",
    price: 449,
    mrp: 599,
    stock: 40,
    rating: 4.6,
    reviewCount: 18,
    isFeatured: true,
    description:
      "A contemporary ceramic bowl featuring a natural stone-inspired aesthetic for modern dining.",
    image:
      "https://images.unsplash.com/photo-1523367438061-01c055ce790c?auto=format&fit=crop&w=1400&q=90",
    specifications: [
      ["Material", "Ceramic"],
      ["Finish", "Stone Inspired"],
      ["Size", "7 Inch"],
      ["Usage", "Dining / Serving"],
      ["Customization", "Available"],
    ],
  },
  {
    name: "Heritage Coffee Mug",
    slug: "heritage-coffee-mug",
    code: "AC-CM-001",
    category: "Cups & Mugs",
    price: 349,
    mrp: 449,
    stock: 60,
    rating: 4.8,
    reviewCount: 63,
    isFeatured: false,
    description:
      "A comfortable ceramic mug designed for coffee, tea and everyday beverage service.",
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1400&q=90",
    specifications: [
      ["Material", "Ceramic"],
      ["Finish", "Glazed"],
      ["Capacity", "350 ml"],
      ["Usage", "Coffee / Tea"],
      ["Customization", "Available"],
    ],
  },
  {
    name: "Modern Serving Collection",
    slug: "modern-serving-collection",
    code: "AC-SW-001",
    category: "Serving Ware",
    price: 1299,
    mrp: 1599,
    stock: 18,
    rating: 4.7,
    reviewCount: 12,
    isFeatured: false,
    description:
      "Contemporary ceramic serving pieces created for elegant presentation and professional food service.",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1400&q=90",
    specifications: [
      ["Material", "Ceramic"],
      ["Finish", "Contemporary"],
      ["Pieces", "5 Pieces"],
      ["Usage", "Serving / Hospitality"],
      ["Customization", "Available"],
    ],
  },
  {
    name: "Hospitality Whiteware",
    slug: "hospitality-whiteware",
    code: "AC-HR-001",
    category: "Hotel & Restaurant",
    price: 899,
    mrp: 1099,
    stock: 100,
    rating: 4.9,
    reviewCount: 37,
    isFeatured: false,
    description:
      "Durable ceramic tableware solutions designed for hotels, restaurants and large-volume hospitality requirements.",
    image:
      "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1400&q=90",
    specifications: [
      ["Material", "Ceramic"],
      ["Finish", "White"],
      ["Usage", "Hotel / Restaurant"],
      ["MOQ", "50 Pieces"],
      ["Customization", "Available"],
    ],
  },
];

const allProducts: SeedProduct[] = [...(products as SeedProduct[]), ...moreProducts, ...khurjaRangeProducts];

const categoryDescriptions: Record<string, string> = {
  ...newCategoryDescriptions,
  ...khurjaCategoryDescriptions,
  "Dinner Sets": "Complete tableware collections for modern dining.",
  Plates: "Elegant ceramic plates for everyday and premium dining.",
  Bowls: "Functional shapes crafted for beautiful presentation.",
  "Cups & Mugs": "Premium ceramic drinkware for homes and businesses.",
  "Serving Ware": "Designed to make every serving look exceptional.",
  "Hotel & Restaurant": "Durable crockery solutions for hospitality businesses.",
};

function categorySlug(name: string) {
  // Strip accents so "Vases & Décor" becomes "vases-decor" (ASCII-only URLs).
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ & /g, "-")
    .replace(/ /g, "-");
}

async function main() {
  for (const product of allProducts) {
    const category = await prisma.category.upsert({
      where: { slug: categorySlug(product.category) },
      update: {
        description: categoryDescriptions[product.category],
        image: product.image,
      },
      create: {
        name: product.category,
        slug: categorySlug(product.category),
        description: categoryDescriptions[product.category],
        image: product.image,
      },
    });

    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        code: product.code,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        rating: product.rating,
        reviewCount: product.reviewCount,
        isFeatured: product.isFeatured,
        description: product.description,
        specifications: product.specifications,
        categoryId: category.id,
      },
      create: {
        name: product.name,
        slug: product.slug,
        code: product.code,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        rating: product.rating,
        reviewCount: product.reviewCount,
        isFeatured: product.isFeatured,
        description: product.description,
        specifications: product.specifications,
        categoryId: category.id,
      },
    });

    const mainImage = await prisma.productImage.findFirst({
      where: { productId: savedProduct.id, sortOrder: 0 },
    });

    if (mainImage) {
      await prisma.productImage.update({
        where: { id: mainImage.id },
        data: { url: product.image, alt: product.name },
      });
    } else {
      await prisma.productImage.create({
        data: {
          productId: savedProduct.id,
          url: product.image,
          alt: product.name,
          sortOrder: 0,
        },
      });
    }
  }

  console.log("Products seeded successfully.");

  // Starter coupon. `update: {}` leaves usage counts and admin edits alone on re-seed.
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      description: "10% off your first order",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderValue: 999,
      maxDiscount: 500,
    },
  });

  console.log("Coupons seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
