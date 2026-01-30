from prisma import Prisma

db = Prisma()


async def connect_db() -> None:
    """Connect to database"""
    if not db.is_connected():
        await db.connect()


async def disconnect_db() -> None:
    """Disconnect from database"""
    if db.is_connected():
        await db.disconnect()


def get_db() -> Prisma:
    """Get database client - pure function"""
    return db
