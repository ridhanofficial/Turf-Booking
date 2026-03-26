"""Quick script to check DB column existence and current alembic head."""
import asyncio
import sys
import os

# Make sure app is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import engine
from sqlalchemy import text


async def main():
    async with engine.connect() as conn:
        # Check alembic version
        try:
            result = await conn.execute(text("SELECT version_num FROM alembic_version"))
            row = result.fetchone()
            print(f"Alembic head: {row[0] if row else 'NONE'}")
        except Exception as e:
            print(f"Alembic table error: {e}")

        # Check columns
        result = await conn.execute(text("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_name IN ('turfs', 'bookings')
              AND column_name IN ('advance_payment_amount', 'bowling_machine_price', 'payment_type', 'amount_paid')
            ORDER BY table_name, column_name
        """))
        rows = result.fetchall()
        if rows:
            print("Columns found:")
            for r in rows:
                print(f"  {r[0]}.{r[1]} ({r[2]}) ✅")
        else:
            print("❌ NONE of the new columns found! Migration has NOT run.")

        # Check a turf's advance_payment_amount
        try:
            result = await conn.execute(text(
                "SELECT id, name, advance_payment_amount FROM turfs LIMIT 5"
            ))
            turfs = result.fetchall()
            print("\nTurfs:")
            for t in turfs:
                print(f"  #{t[0]} {t[1]}: advance_payment_amount = {t[2]}")
        except Exception as e:
            print(f"Turf query error: {e}")


asyncio.run(main())
