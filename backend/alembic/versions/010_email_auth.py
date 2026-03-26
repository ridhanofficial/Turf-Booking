"""Alembic migration 010: email auth transition.

- Makes `users.email` NOT NULL (was nullable).
- Makes `users.mobile_number` nullable (was NOT NULL).
- Adds a unique index on `users.email` if not already present.

Run: alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "010"
down_revision = "009_discount_min_slots"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Fill any NULL emails with a placeholder derived from mobile_number so
    #    the NOT NULL constraint can be added without failing.
    op.execute(
        """
        UPDATE users
        SET email = 'legacy_' || REPLACE(mobile_number, '+', '') || '@placeholder.invalid'
        WHERE email IS NULL AND mobile_number IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE users
        SET email = 'legacy_unknown_' || id || '@placeholder.invalid'
        WHERE email IS NULL
        """
    )

    # 2. Add unique index on email if it doesn't already exist.
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE tablename = 'users' AND indexname = 'ix_users_email'
            ) THEN
                CREATE UNIQUE INDEX ix_users_email ON users (email);
            END IF;
        END$$;
        """
    )

    # 3. Make email NOT NULL.
    op.alter_column("users", "email", nullable=False)

    # 4. Make mobile_number nullable.
    op.alter_column("users", "mobile_number", nullable=True)


def downgrade() -> None:
    # Reverse step 4 — make mobile_number NOT NULL again (requires no nulls)
    op.alter_column("users", "mobile_number", nullable=False)
    # Reverse step 3 — make email nullable again
    op.alter_column("users", "email", nullable=True)
