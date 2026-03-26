"""Migrate image_urls and amenities from TEXT to JSONB in turfs table

Revision ID: 003_turf_jsonb
Revises: 002_user_profile
Create Date: 2026-02-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '003_turf_jsonb'
down_revision = '002_user_profile'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Add new JSONB columns alongside the old TEXT columns
    op.add_column('turfs', sa.Column('image_urls_new', JSONB, nullable=True))
    op.add_column('turfs', sa.Column('amenities_new', JSONB, nullable=True))

    # Step 2: Migrate existing text data to JSONB
    op.execute("""
        UPDATE turfs
        SET
            image_urls_new = CASE
                WHEN image_urls IS NOT NULL AND image_urls != '' THEN image_urls::jsonb
                ELSE '[]'::jsonb
            END,
            amenities_new = CASE
                WHEN amenities IS NOT NULL AND amenities != '' THEN amenities::jsonb
                ELSE '[]'::jsonb
            END
    """)

    # Step 3: Drop old TEXT columns
    op.drop_column('turfs', 'image_urls')
    op.drop_column('turfs', 'amenities')

    # Step 4: Rename new JSONB columns to original names
    op.alter_column('turfs', 'image_urls_new', new_column_name='image_urls')
    op.alter_column('turfs', 'amenities_new', new_column_name='amenities')


def downgrade() -> None:
    # Step 1: Add TEXT columns back
    op.add_column('turfs', sa.Column('image_urls_old', sa.Text, nullable=True))
    op.add_column('turfs', sa.Column('amenities_old', sa.Text, nullable=True))

    # Step 2: Cast JSONB back to TEXT
    op.execute("""
        UPDATE turfs
        SET
            image_urls_old = image_urls::text,
            amenities_old = amenities::text
    """)

    # Step 3: Drop JSONB columns
    op.drop_column('turfs', 'image_urls')
    op.drop_column('turfs', 'amenities')

    # Step 4: Rename old ones back
    op.alter_column('turfs', 'image_urls_old', new_column_name='image_urls')
    op.alter_column('turfs', 'amenities_old', new_column_name='amenities')
