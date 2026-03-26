"""Add bowling_machine_price to turfs table

Revision ID: 007_bowling_machine_price
Revises: 006_bowling_machine
Create Date: 2026-02-23
"""
from alembic import op
import sqlalchemy as sa

revision = '007_bowling_machine_price'
down_revision = '006_bowling_machine'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'turfs',
        sa.Column('bowling_machine_price', sa.Numeric(10, 2), nullable=True, server_default='200'),
    )


def downgrade() -> None:
    op.drop_column('turfs', 'bowling_machine_price')
