"""Add min_slots column to discounts table

Revision ID: 009_discount_min_slots
Revises: ea25d5270c40
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '009_discount_min_slots'
down_revision = 'ea25d5270c40'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'discounts',
        sa.Column('min_slots', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('discounts', 'min_slots')
