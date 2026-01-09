"""
Database Seed Script
Creates the initial admin user
"""
import asyncio
import bcrypt
from prisma import Prisma

# Default admin credentials
ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@shemamaps.com"
ADMIN_PASSWORD = "admin123"  # Change this in production!


async def seed():
    db = Prisma()
    await db.connect()
    
    try:
        # Check if admin already exists
        existing = await db.user.find_first(
            where={"username": ADMIN_USERNAME}
        )
        
        if existing:
            print(f"Admin user '{ADMIN_USERNAME}' already exists")
            return
        
        # Create admin user - hash password with bcrypt directly
        password_hash = bcrypt.hashpw(
            ADMIN_PASSWORD.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        
        admin = await db.user.create(
            data={
                "username": ADMIN_USERNAME,
                "email": ADMIN_EMAIL,
                "passwordHash": password_hash,
                "role": "admin",
                "isApproved": True
            }
        )
        
        print(f"✅ Created admin user:")
        print(f"   Username: {ADMIN_USERNAME}")
        print(f"   Password: {ADMIN_PASSWORD}")
        print(f"   Email: {ADMIN_EMAIL}")
        print(f"\n⚠️  IMPORTANT: Change this password after first login!")
        
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(seed())
