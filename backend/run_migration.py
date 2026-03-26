"""
Run this from the backend folder while uvicorn is NOT running.
It uses the app's own SQLAlchemy async engine (which already works) to add columns.
  python run_migration.py
"""
import asyncio
import sys, os

sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import engine
from sqlalchemy import text


async def column_exists(conn, table: str, col: str) -> bool:
    r = await conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name=:t AND column_name=:c"
    ), {"t": table, "c": col})
    return r.fetchone() is not None


async def main():
    print("Connecting via app engine...", flush=True)
    async with engine.begin() as conn:
        print("Connected!", flush=True)

        # turfs.advance_payment_amount
        if await column_exists(conn, "turfs", "advance_payment_amount"):
            print("turfs.advance_payment_amount already exists ✅", flush=True)
        else:
            await conn.execute(text(
                "ALTER TABLE turfs ADD COLUMN advance_payment_amount NUMERIC(10,2)"
            ))
            print("Added turfs.advance_payment_amount ✅", flush=True)

        # bookings.payment_type
        if await column_exists(conn, "bookings", "payment_type"):
            print("bookings.payment_type already exists ✅", flush=True)
        else:
            await conn.execute(text(
                "ALTER TABLE bookings ADD COLUMN payment_type VARCHAR(10)"
            ))
            print("Added bookings.payment_type ✅", flush=True)

        # bookings.amount_paid
        if await column_exists(conn, "bookings", "amount_paid"):
            print("bookings.amount_paid already exists ✅", flush=True)
        else:
            await conn.execute(text(
                "ALTER TABLE bookings ADD COLUMN amount_paid NUMERIC(10,2)"
            ))
            print("Added bookings.amount_paid ✅", flush=True)

        # Show current turf state
        rows = (await conn.execute(text(
            "SELECT id, name, advance_payment_amount FROM turfs ORDER BY id"
        ))).fetchall()
        print("\nTurfs:", flush=True)
        for r in rows:
            print(f"  #{r[0]} {r[1]:30s}  advance_payment_amount = {r[2]}", flush=True)

    print("\n✅ Migration complete!", flush=True)
    await engine.dispose()


asyncio.run(main())
