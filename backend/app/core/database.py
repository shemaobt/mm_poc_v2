import os
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

from prisma import Prisma

# Default pool settings to avoid "Timed out fetching a new connection from the connection pool"
# Override with CONNECTION_POOL_LIMIT / CONNECTION_POOL_TIMEOUT env if needed.
_DEFAULT_CONNECTION_LIMIT = os.environ.get("CONNECTION_POOL_LIMIT", "10")
_DEFAULT_POOL_TIMEOUT = os.environ.get("CONNECTION_POOL_TIMEOUT", "20")


def _ensure_pool_params_in_url() -> None:
    """Ensure DATABASE_URL has connection_limit and pool_timeout so the pool doesn't exhaust or timeout."""
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        return
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if "connection_limit" not in query:
        query["connection_limit"] = [_DEFAULT_CONNECTION_LIMIT]
    if "pool_timeout" not in query:
        query["pool_timeout"] = [_DEFAULT_POOL_TIMEOUT]
    new_query = urlencode([(k, v[0]) for k, v in query.items()])
    new = parsed._replace(query=new_query)
    os.environ["DATABASE_URL"] = urlunparse(new)


_ensure_pool_params_in_url()

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
