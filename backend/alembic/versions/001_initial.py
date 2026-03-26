"""Initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-02-18

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mobile_number', sa.String(15), nullable=False),
        sa.Column('status', sa.Enum('active', 'blocked', name='userstatus'), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('mobile_number'),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_mobile_number', 'users', ['mobile_number'])

    # admins
    op.create_table(
        'admins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_admins_id', 'admins', ['id'])
    op.create_index('ix_admins_email', 'admins', ['email'])

    # turfs
    op.create_table(
        'turfs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('sport_type', sa.Enum('cricket', 'football', 'basketball', 'badminton', 'tennis', 'volleyball', 'multi', name='sporttype'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('operating_start_time', sa.Time(), nullable=False),
        sa.Column('operating_end_time', sa.Time(), nullable=False),
        sa.Column('slot_duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('base_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('status', sa.Enum('active', 'inactive', name='turfstatus'), nullable=False, server_default='active'),
        sa.Column('image_urls', sa.Text(), nullable=True),
        sa.Column('amenities', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_turfs_id', 'turfs', ['id'])
    op.create_index('ix_turfs_sport_type', 'turfs', ['sport_type'])
    op.create_index('ix_turfs_status', 'turfs', ['status'])

    # bookings (before slots due to FK)
    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('turf_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('total_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('status', sa.Enum('pending', 'confirmed', 'cancelled', name='bookingstatus'), nullable=False, server_default='pending'),
        sa.Column('razorpay_order_id', sa.String(255), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['turf_id'], ['turfs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('razorpay_order_id'),
    )
    op.create_index('ix_bookings_id', 'bookings', ['id'])
    op.create_index('ix_bookings_status', 'bookings', ['status'])
    op.create_index('ix_bookings_user_turf_date', 'bookings', ['user_id', 'turf_id', 'date'])

    # slots
    op.create_table(
        'slots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('turf_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('status', sa.Enum('available', 'held', 'booked', 'disabled', name='slotstatus'), nullable=False, server_default='available'),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['turf_id'], ['turfs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_slots_id', 'slots', ['id'])
    op.create_index('ix_slots_turf_date', 'slots', ['turf_id', 'date'])
    op.create_index('ix_slots_turf_date_status', 'slots', ['turf_id', 'date', 'status'])

    # features
    op.create_table(
        'features',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('extra_price', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('ix_features_id', 'features', ['id'])

    # booking_features
    op.create_table(
        'booking_features',
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('feature_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['feature_id'], ['features.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('booking_id', 'feature_id'),
    )

    # pricing_rules
    op.create_table(
        'pricing_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('turf_id', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('day_type', sa.Enum('weekday', 'weekend', 'all', name='daytype'), nullable=False, server_default='all'),
        sa.ForeignKeyConstraint(['turf_id'], ['turfs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pricing_rules_id', 'pricing_rules', ['id'])
    op.create_index('ix_pricing_rules_turf', 'pricing_rules', ['turf_id'])

    # discounts
    op.create_table(
        'discounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(50), nullable=True),
        sa.Column('type', sa.Enum('flat', 'percent', name='discounttype'), nullable=False),
        sa.Column('value', sa.Numeric(10, 2), nullable=False),
        sa.Column('valid_from', sa.Date(), nullable=False),
        sa.Column('valid_to', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_discounts_id', 'discounts', ['id'])


def downgrade() -> None:
    op.drop_table('discounts')
    op.drop_table('pricing_rules')
    op.drop_table('booking_features')
    op.drop_table('features')
    op.drop_table('slots')
    op.drop_table('bookings')
    op.drop_table('turfs')
    op.drop_table('admins')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS sporttype")
    op.execute("DROP TYPE IF EXISTS turfstatus")
    op.execute("DROP TYPE IF EXISTS bookingstatus")
    op.execute("DROP TYPE IF EXISTS slotstatus")
    op.execute("DROP TYPE IF EXISTS daytype")
    op.execute("DROP TYPE IF EXISTS discounttype")
