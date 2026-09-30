// Promotes an existing account to ADMIN (the first admin has to come from
// somewhere). Usage: npm run make-admin -- someone@example.com
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) {
    console.error(`No account found for ${email}. Register on the site first, then run this again.`);
    process.exit(1);
  }

  await prisma.customer.update({ where: { email }, data: { role: "ADMIN", isActive: true } });
  console.log(`${customer.name} <${email}> is now an admin. Log out and back in to see the admin panel.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
