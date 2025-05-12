# Prisma Bun Adapter – Basic Example

This example demonstrates how to use the **@prisma/adapter-bun** driver adapter with Prisma ORM inside the Bun runtime.

## Prerequisites

1. Bun ≥ 1.0.0 installed globally – https://bun.sh
2. PostgreSQL instance running and reachable.
3. `DATABASE_URL` environment variable pointing to the database (create a `.env` file or export it in your shell).

## Getting started

```bash
# Navigate into the example folder
cd examples/basic

# Install dependencies (links the adapter from the monorepo)
bun add ../../

# Generate Prisma Client
bunx prisma generate

# Apply the Prisma schema – this will create the tables
bunx prisma migrate dev --name init

# Run the example script
bun run index.ts
```

The script will create a user record and then print all users in the database.

## Project layout

```
examples/basic
├── index.ts          # Example script
├── package.json      # Dependencies & scripts
├── schema.prisma     # Prisma schema with a simple User model
└── README.md         # This file
```

Have fun experimenting! 🚀 