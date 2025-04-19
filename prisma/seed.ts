import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.role.createMany({
    data: [
      { id: 1, name: "Admin", priority: 10 },
      { id: 2, name: "Moderator", priority: 50 },
      { id: 3, name: "Premium", priority: 100 },
      { id: 4, name: "User", priority: 150 },
    ],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
