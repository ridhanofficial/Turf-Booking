"""
Direct sync migration — adds columns to Neon DB using psycopg2.
Run: python apply_008_sync.py
"""
import psycopg2
import sys

DATABASE_URL = (
    "host=ep-solitary-dawn-aia5ou7n-pooler.c-4.us-east-1.aws.neon.tech "
    "dbname=neondb "
    "user=neondb_owner "
    "password=npg_aMTY9dzmQ5IX "
    "sslmode=require"
)


def run():
    print("Connecting to Neon DB...", flush=True)
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        print("Connected!", flush=True)
    except Exception as e:
        print(f"Connection failed: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    def col_exists(table, col):
        cur.execute("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name=%s AND column_name=%s
        """, (table, col))
        return cur.fetchone() is not None

    # turfs.advance_payment_amount
    if col_exists("turfs", "advance_payment_amount"):
        print("turfs.advance_payment_amount already exists ✅", flush=True)
    else:
        cur.execute("ALTER TABLE turfs ADD COLUMN advance_payment_amount NUMERIC(10,2)")
        print("Added turfs.advance_payment_amount ✅", flush=True)

    # bookings.payment_type
    if col_exists("bookings", "payment_type"):
        print("bookings.payment_type already exists ✅", flush=True)
    else:
        cur.execute("ALTER TABLE bookings ADD COLUMN payment_type VARCHAR(10)")
        print("Added bookings.payment_type ✅", flush=True)

    # bookings.amount_paid
    if col_exists("bookings", "amount_paid"):
        print("bookings.amount_paid already exists ✅", flush=True)
    else:
        cur.execute("ALTER TABLE bookings ADD COLUMN amount_paid NUMERIC(10,2)")
        print("Added bookings.amount_paid ✅", flush=True)

    # Show turfs
    cur.execute("SELECT id, name, advance_payment_amount FROM turfs ORDER BY id")
    rows = cur.fetchall()
    print("\nTurfs in DB:", flush=True)
    for r in rows:
        print(f"  #{r[0]} {r[1]}  =>  advance_payment_amount = {r[2]}", flush=True)

    cur.close()
    conn.close()
    print("\nDone!", flush=True)


run()
