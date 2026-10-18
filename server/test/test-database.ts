import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

export async function createTestDatabase() {
	const connectionString =
		process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
	if (!connectionString)
		throw new Error('A PostgreSQL URL is required for integration tests')
	const schema = `sf_oauth_test_${randomBytes(12).toString('hex')}`
	const pool = new Pool({ connectionString, connectionTimeoutMillis: 3000 })
	const client = await pool.connect()
	try {
		// Only a newly generated test schema is touched. Existing schemas and rows are never modified.
		await client.query(`CREATE SCHEMA "${schema}"`)
		await client.query(`SET search_path TO "${schema}"`)
		const migrations = new URL('../prisma/migrations/', import.meta.url)
		for (const directory of (await readdir(migrations, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.sort((a, b) => a.name.localeCompare(b.name))) {
			await client.query(
				await readFile(
					new URL(`${directory.name}/migration.sql`, migrations),
					'utf8'
				)
			)
		}
	} catch {
		await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
		throw new Error('Could not prepare an isolated OAuth test schema')
	} finally {
		client.release()
	}
	const db = new PrismaClient({
		adapter: new PrismaPg({ connectionString }, { schema })
	})
	return {
		db,
		async close() {
			await db.$disconnect()
			await pool.query(`DROP SCHEMA "${schema}" CASCADE`)
			await pool.end()
		}
	}
}
