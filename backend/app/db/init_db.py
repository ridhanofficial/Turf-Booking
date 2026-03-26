"""
DB initialization — seeds the admin user on first run.
"""
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import Admin
from app.core.security import hash_password
from app.core.config import settings

logger = logging.getLogger(__name__)


async def init_db(db: AsyncSession):
    """Create default admin if not exists.

    Skips gracefully if DB tables don't exist yet (migrations not yet applied).
    Run `alembic upgrade head` to apply migrations before seeding.
    """
    try:
        result = await db.execute(
            select(Admin).where(Admin.email == settings.ADMIN_EMAIL)
        )
    except Exception as exc:
        await db.rollback()
        logger.warning(
            "init_db skipped — DB tables not ready yet. "
            "Run 'alembic upgrade head' then restart. Error: %s",
            exc,
        )
        return

    admin = result.scalar_one_or_none()

    if not admin:
        admin = Admin(
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        logger.info("Default admin created: %s", settings.ADMIN_EMAIL)
    else:
        logger.info("Admin already exists, skipping seed")
