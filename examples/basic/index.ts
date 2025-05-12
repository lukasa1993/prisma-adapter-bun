import { sql } from 'bun'
import { PrismaBun } from '@prisma/adapter-bun'
import { PrismaClient } from '@prisma/client'

// Create adapter using existing Bun.sql instance
const adapter = new PrismaBun(sql, {
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  // Create a user
  await prisma.user.create({
    data: {
      email: 'alice@prisma.io',
      name: 'Alice',
    },
  })

  // Query all users
  const users = await prisma.user.findMany()
  console.log('Users in DB:', users)
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 