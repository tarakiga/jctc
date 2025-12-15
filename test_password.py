#!/usr/bin/env python3
import bcrypt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))

# Test with the hash we stored
stored_hash = "$2b$12$.SYXpeBBZ8d3DMt82GFYA.sphiY.JedBfb55/XC8sXxlhb.vUuzaVS"
password = "AdminPass2025!"

print(f"Testing password: {password}")
print(f"Against hash: {stored_hash}")
print(f"Result: {verify_password(password, stored_hash)}")

# Generate a new hash and verify
new_salt = bcrypt.gensalt(12)
new_hash = bcrypt.hashpw(password.encode('utf-8'), new_salt)
print(f"\nNew hash: {new_hash.decode()}")
print(f"Verify new hash: {bcrypt.checkpw(password.encode('utf-8'), new_hash)}")
