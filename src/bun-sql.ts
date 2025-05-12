import { sql as bunSql, SQL } from 'bun'
import {
  ColumnTypeEnum,
  Debug,
  DriverAdapterError,
  SqlDriverAdapter,
  SqlMigrationAwareDriverAdapterFactory,
  SqlQuery,
  SqlQueryable,
  SqlResultSet,
  Transaction,
  TransactionOptions,
  ConnectionInfo,
} from '@prisma/driver-adapter-utils'

// Minimal, best-effort mapping. All columns default to Text for now
const DEFAULT_COLUMN_TYPE = ColumnTypeEnum.Text

const debug = Debug('prisma:driver-adapter:bun-sql')

/**
 * Wraps a Bun.sql instance (or bun SQL transaction instance) to expose the
 * SqlQueryable API expected by the Prisma driver-adapter utils.
 */
class BunQueryable implements SqlQueryable {
  readonly provider = 'postgres'
  readonly adapterName = 'prisma-adapter-bun'

  constructor(private readonly client: typeof bunSql | SQL) {}

  async queryRaw(query: SqlQuery): Promise<SqlResultSet> {
    const tag = '[bun::query_raw]'
    debug('%s %O', tag, query)

    const { sql, args } = query

    try {
      // Use Bun's unsafe helper so we can pass an already-built SQL string with
      // parameter placeholders (e.g. $1, $2, ...).
      // Bun will bind the provided args array for us.
      const result = await (this.client as any /* Bun.sql instance */)
        .unsafe(sql, args)
        .all()

      // `result` is an array of objects. Derive column names from the first
      // row (if any) and then convert the objects into value arrays.
      const columnNames =
        result.length > 0 ? Object.keys(result[0]) : ([] as string[])

      const rows = result.map((row: any) =>
        columnNames.map((name) => (row as any)[name]),
      )

      const columnTypes = columnNames.map(() => DEFAULT_COLUMN_TYPE)

      return {
        columnNames,
        columnTypes,
        rows,
      }
    } catch (e) {
      this.onError(e)
    }
  }

  async executeRaw(query: SqlQuery): Promise<number> {
    const tag = '[bun::execute_raw]'
    debug('%s %O', tag, query)

    const { sql, args } = query

    try {
      const execResult = await (this.client as any).unsafe(sql, args).execute()
      // Bun.sql execute() resolves to the rows (array). It also attaches a
      // `rowCount` property on the query object. Fallback to 0.
      const rowCount: number = (execResult as any)?.rowCount ?? 0
      return rowCount
    } catch (e) {
      this.onError(e)
    }
  }

  protected onError(error: any): never {
    debug('Error in BunQueryable: %O', error)
    throw new DriverAdapterError({
      kind: 'GenericJs',
      id: 0,
    })
  }
}

class BunTransaction
  extends BunQueryable
  implements Transaction
{
  constructor(private readonly tx: any, readonly options: TransactionOptions) {
    super(tx)
  }

  async commit(): Promise<void> {
    debug('[bun::commit]')
    await this.tx.commit?.()
  }

  async rollback(): Promise<void> {
    debug('[bun::rollback]')
    await this.tx.rollback?.()
  }
}

export interface PrismaBunOptions {
  connectionString?: string
  schema?: string
}

export class PrismaBunAdapter
  extends BunQueryable
  implements SqlDriverAdapter
{
  private readonly sqlClient: typeof bunSql | SQL

  constructor(client: typeof bunSql | SQL, private options?: PrismaBunOptions) {
    super(client)
    this.sqlClient = client
  }

  async startTransaction(): Promise<Transaction> {
    debug('[bun::startTransaction]')
    // Note: Bun.sql.begin(...) currently returns the callback result, not a
    // transaction-scoped sql instance. Instead we use `reserve()` which gives
    // us an exclusive connection we can treat as a transaction client.
    const reserved = await (this.sqlClient as any).reserve()

    return new BunTransaction(reserved, { usePhantomQuery: false })
  }

  async executeScript(script: string): Promise<void> {
    // Simple split by semi-colon; Bun.sql.simple() could also be used.
    const statements = script.split(';').map((s) => s.trim()).filter(Boolean)
    for (const stmt of statements) {
      await (this.sqlClient as any).unsafe(stmt).execute()
    }
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      schemaName: this.options?.schema,
    }
  }

  async dispose(): Promise<void> {
    if (typeof (this.sqlClient as any).close === 'function') {
      await (this.sqlClient as any).close()
    }
  }
}

export class PrismaBunAdapterFactory
  implements SqlMigrationAwareDriverAdapterFactory
{
  readonly provider = 'postgres'
  readonly adapterName = 'prisma-adapter-bun'

  constructor(private readonly options?: PrismaBunOptions) {}

  private createClient(): typeof bunSql | SQL {
    if (this.options?.connectionString) {
      return new SQL(this.options.connectionString)
    }
    return bunSql
  }

  async connect(): Promise<SqlDriverAdapter> {
    const client = this.createClient()
    return new PrismaBunAdapter(client, this.options)
  }

  async connectToShadowDb(): Promise<SqlDriverAdapter> {
    // Shadow DB support – create a transient DB name and drop after use.
    const shadowName = `prisma_migrate_shadow_db_${globalThis.crypto.randomUUID()}`
    const client = this.createClient()

    await client.unsafe(`CREATE DATABASE "${shadowName}"`).execute()
    const shadowConnString = `${this.options?.connectionString ?? ''}/${shadowName}`
    const shadowClient = new SQL(shadowConnString)

    return new PrismaBunAdapter(shadowClient, undefined)
  }
} 