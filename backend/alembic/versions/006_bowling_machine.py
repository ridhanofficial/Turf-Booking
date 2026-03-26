"""Add with_bowling_machine to bookings table

Revision ID: 006_bowling_machine
Revises: 005_facility_types
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa

revision = '006_bowling_machine'
down_revision = '005_facility_types'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'bookings',
        sa.Column('with_bowling_machine', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_column('bookings', 'with_bowling_machine')
