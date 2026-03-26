import asyncio
import asyncpg

async def main():
    with open('.env') as f:
        env = dict(line.strip().split('=', 1) for line in f if '=' in line and not line.startswith('#'))
    db_url = env['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql')
    conn = await asyncpg.connect(db_url)
    users = await conn.fetch("SELECT id, mobile_number, name, email FROM users ORDER BY id")
    print('All users:')
    for u in users:
        print(f"  id={u['id']} mobile={u['mobile_number']} name={u['name']} email={u['email']}")
    await conn.close()

asyncio.run(main())
