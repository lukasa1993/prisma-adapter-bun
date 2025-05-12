# @prisma/adapter-bun

This package contains a driver adapter for Prisma ORM that enables usage of Bun's native `bun:sqlite` / SQL primitives (via `Bun.sql`) to communicate with a PostgreSQL database. This means you can run Prisma entirely inside the Bun runtime **without any Node-specific drivers**.

> **Note:** Support for driver adapters is available in Prisma versions ≥ 5.4.2 through the `driverAdapters` Preview feature flag.

## Usage

The following steps show how to use the `@prisma/adapter-bun` driver adapter with Prisma. Make sure the `DATABASE_URL` environment variable contains your PostgreSQL connection string (e.g. in a `.env` file).

### 1. Enable the `driverAdapters` Preview feature flag

Add the flag to the `generator` section in your Prisma schema:

```prisma
// schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Afterwards, re-generate Prisma Client:

```bash
bunx prisma generate
```

### 2. Install the dependency

Add the Bun adapter package to your project:

```bash
bun add @prisma/adapter-bun
```

_No additional database driver is required — Bun ships its own SQL client._

### 3. Instantiate Prisma Client using the adapter

Create your Prisma Client instance and pass the adapter in the constructor:

```ts
import { sql } from 'bun'
import { PrismaBun } from '@prisma/adapter-bun'
import { PrismaClient } from '@prisma/client'

// Option 1 – use an existing Bun.sql instance
const adapter = new PrismaBun(sql)

// Option 2 – let the adapter create its own connection by providing a connection string
// const adapter = new PrismaBun(undefined, { connectionString: process.env.DATABASE_URL })

const prisma = new PrismaClient({ adapter })
```

## Feedback & Issues

Found a bug or have feedback? Please open an issue in this repository.
