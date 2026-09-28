import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
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
    description:
      "Elegant ivory ceramic dinner collection designed for modern dining.",
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
    description:
      "Classic white ceramic plate suitable for everyday and hospitality use.",
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
    description:
      "Stone-finish ceramic bowl combining durability with contemporary styling.",
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
    description:
      "Premium ceramic coffee mug with a timeless heritage-inspired design.",
  },
  {
    name: "Modern Serving Collection",
    slug: "modern-serving-collection",
    code: "AC-SW-001",
    category: "Serving Ware",
    price: 1299,
    mrp: 1599,
    stock: 30,
    rating: 4.7,
    description:
      "Modern ceramic serving collection for dining tables, cafés and restaurants.",
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
    description:
      "Durable white ceramic crockery designed for hotels and restaurants.",
  },
];

async function main() {
  for (const product of products) {
    const category = await prisma.category.upsert({
      where: {
        slug: product.category.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"),
      },
      update: {},
      create: {
        name: product.category,
        slug: product.category
          .toLowerCase()
          .replace(/ & /g, "-")
          .replace(/ /g, "-"),
      },
    });

    await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      update: {
        name: product.name,
        code: product.code,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        rating: product.rating,
        description: product.description,
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
        description: product.description,
        categoryId: category.id,
      },
    });
  }

  console.log("Products seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });