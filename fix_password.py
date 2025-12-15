#!/usr/bin/env python3
import bcrypt
import asyncpg
import asyncio
import os

async def main():
    password = b"AdminPass2025!"
    salt = bcrypt.gensalt(12)
    hashed = bcrypt.hashpw(password, salt)
    hash_str = hashed.decode()
    
    print(f"HASH: {hash_str}")
    print(f"VERIFY: {bcrypt.checkpw(password, hashed)}")
    
    # Get DATABASE_URL from environment
    db_url = os.environ.get("DATABASE_URL", "").replace("+asyncpg", "")
    print(f"DATABASE_URL: {db_url[:50]}...")
    
    conn = await asyncpg.connect(db_url)
    
    result = await conn.execute(
        "UPDATE users SET hashed_password = $1 WHERE email = $2",
        hash_str, "admin@jctc.ng"
    )
    print(f"RESULT: {result}")
    
    row = await conn.fetchrow(
        "SELECT email, hashed_password FROM users WHERE email = $1",
        "admin@jctc.ng"
    )
    print(f"STORED: {row['hashed_password']}")
    print(f"MATCH: {row['hashed_password'] == hash_str}")
    
    await conn.close()

asyncio.run(main())
