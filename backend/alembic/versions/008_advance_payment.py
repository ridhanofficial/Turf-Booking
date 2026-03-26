"""Add advance_payment_amount to turfs, payment_type and amount_paid to bookings

Revision ID: 008_advance_payment
Revises: 007_bowling_machine_price
Create Date: 2026-02-25

"""
from alembic import op
import sqlalchemy as sa

revision = '008_advance_payment'
down_revision = '007_bowling_machine_price'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add advance_payment_amount to turfs (nullable — None means no advance option)
    op.add_column('turfs', sa.Column('advance_payment_amount', sa.Numeric(10, 2), nullable=True))

    # Add payment tracking columns to bookings
    op.add_column('bookings', sa.Column('payment_type', sa.String(10), nullable=True))
    op.add_column('bookings', sa.Column('amount_paid', sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('bookings', 'amount_paid')
    op.drop_column('bookings', 'payment_type')
    op.drop_column('turfs', 'advance_payment_amount')
