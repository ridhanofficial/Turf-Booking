"""
Direct migration script — adds advance_payment_amount, payment_type, amount_paid columns
and stamps alembic_version to 008_advance_payment.
Run from backend folder: python apply_008.py
"""
import asyncio
import asyncpg

# ── DB connection string (strip asyncpg driver prefix) ────────────────────────
DATABASE_URL = (
    "postgresql://neondb_owner:npg_aMTY9dzmQ5IX"
    "@ep-solitary-dawn-aia5ou7n-pooler.c-4.us-east-1.aws.neon.tech/neondb"
    "?sslmode=require"
)


async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # ── 1. Check / create alembic_version table ───────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS alembic_version (
                version_num VARCHAR(32) NOT NULL
            )
        """)

        current = await conn.fetchval("SELECT version_num FROM alembic_version LIMIT 1")
        print(f"Current alembic version: {current or 'none'}")

        # ── 2. Add columns to turfs if missing ────────────────
        col_exists = await conn.fetchval("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'turfs' AND column_name = 'advance_payment_amount'
        """)
        if col_exists:
            print("advance_payment_amount already exists in turfs ✅")
        else:
            await conn.execute(
                "ALTER TABLE turfs ADD COLUMN advance_payment_amount NUMERIC(10,2)"
            )
            print("Added advance_payment_amount to turfs ✅")

        # ── 3. Add columns to bookings if missing ─────────────
        for col, dtype in [("payment_type", "VARCHAR(10)"), ("amount_paid", "NUMERIC(10,2)")]:
            col_exists = await conn.fetchval(f"""
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'bookings' AND column_name = '{col}'
            """)
            if col_exists:
                print(f"{col} already exists in bookings ✅")
            else:
                await conn.execute(f"ALTER TABLE bookings ADD COLUMN {col} {dtype}")
                print(f"Added {col} to bookings ✅")

        # ── 4. Stamp alembic version ──────────────────────────
        if current is None:
            await conn.execute(
                "INSERT INTO alembic_version VALUES ('008_advance_payment')"
            )
        else:
            await conn.execute(
                "UPDATE alembic_version SET version_num = '008_advance_payment'"
            )
        print("Stamped alembic_version = 008_advance_payment ✅")

        # ── 5. Show current turfs and their advance amounts ───
        rows = await conn.fetch("SELECT id, name, advance_payment_amount FROM turfs")
        print("\nCurrent turfs:")
        for r in rows:
            print(f"  #{r['id']} {r['name']} — advance_payment_amount = {r['advance_payment_amount']}")

        print("\n✅ Migration complete!")
    finally:
        await conn.close()


asyncio.run(main())
