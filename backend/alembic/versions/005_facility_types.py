"""Replace surface-type enum with facility-type enum in turfs table

Revision ID: 005_facility_types
Revises: 004_surface_types
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa

revision = '005_facility_types'
down_revision = '004_surface_types'
branch_labels = None
depends_on = None

NEW_VALUES = ('full_pitch', 'net_normal', 'net_cement')
OLD_VALUES = ('natural_grass', 'synthetic', 'hybrid')
TYPE_NAME = 'sporttype'


def upgrade() -> None:
    # 1. Add temp TEXT column
    op.add_column('turfs', sa.Column('facility_type_new', sa.Text, nullable=True))

    # 2. Default all existing rows to 'full_pitch'
    op.execute("UPDATE turfs SET facility_type_new = 'full_pitch'")

    # 3. Drop old sport_type column and index
    op.drop_index(op.f('ix_turfs_sport_type'), table_name='turfs')
    op.drop_column('turfs', 'sport_type')

    # 4. Drop old enum type
    op.execute(f"DROP TYPE IF EXISTS {TYPE_NAME}")

    # 5. Create new enum type with facility values
    new_enum = sa.Enum(*NEW_VALUES, name=TYPE_NAME)
    new_enum.create(op.get_bind())

    # 6. Add new facility_type column
    op.add_column('turfs', sa.Column('facility_type', sa.Enum(*NEW_VALUES, name=TYPE_NAME), nullable=True))

    # 7. Populate from temp column
    op.execute("UPDATE turfs SET facility_type = facility_type_new::sporttype")

    # 8. Set NOT NULL, drop temp column, restore index
    op.alter_column('turfs', 'facility_type', nullable=False)
    op.drop_column('turfs', 'facility_type_new')
    op.create_index(op.f('ix_turfs_facility_type'), 'turfs', ['facility_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_turfs_facility_type'), table_name='turfs')
    op.add_column('turfs', sa.Column('sport_type_old', sa.Text, nullable=True))
    op.execute("UPDATE turfs SET sport_type_old = 'natural_grass'")
    op.drop_column('turfs', 'facility_type')
    op.execute(f"DROP TYPE IF EXISTS {TYPE_NAME}")
    old_enum = sa.Enum(*OLD_VALUES, name=TYPE_NAME)
    old_enum.create(op.get_bind())
    op.add_column('turfs', sa.Column('sport_type', sa.Enum(*OLD_VALUES, name=TYPE_NAME), nullable=True))
    op.execute("UPDATE turfs SET sport_type = sport_type_old::sporttype")
    op.alter_column('turfs', 'sport_type', nullable=False)
    op.drop_column('turfs', 'sport_type_old')
    op.create_index(op.f('ix_turfs_sport_type'), 'turfs', ['sport_type'], unique=False)
