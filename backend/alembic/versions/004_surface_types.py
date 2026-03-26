"""Replace sport-type enum with surface-type enum in turfs table

Revision ID: 004_surface_types
Revises: 003_turf_jsonb
Create Date: 2026-02-20

"""
from alembic import op
import sqlalchemy as sa

revision = '004_surface_types'
down_revision = '003_turf_jsonb'
branch_labels = None
depends_on = None

NEW_ENUM_VALUES = ('natural_grass', 'synthetic', 'hybrid')
OLD_ENUM_VALUES = ('cricket', 'football', 'basketball', 'badminton', 'tennis', 'volleyball', 'multi')
TYPE_NAME = 'sporttype'


def upgrade() -> None:
    # 1. Add a plain TEXT column alongside the existing enum column
    op.add_column('turfs', sa.Column('sport_type_new', sa.Text, nullable=True))

    # 2. Default existing rows to 'natural_grass' (safest fallback)
    op.execute("UPDATE turfs SET sport_type_new = 'natural_grass'")

    # 3. Drop the old enum column
    op.drop_column('turfs', 'sport_type')

    # 4. Drop the old enum type
    op.execute(f"DROP TYPE IF EXISTS {TYPE_NAME}")

    # 5. Create the new enum type with surface values
    new_enum = sa.Enum(*NEW_ENUM_VALUES, name=TYPE_NAME)
    new_enum.create(op.get_bind())

    # 6. Add the new enum column with the correct type
    op.add_column('turfs', sa.Column('sport_type', sa.Enum(*NEW_ENUM_VALUES, name=TYPE_NAME), nullable=True))

    # 7. Populate from temp column
    op.execute("UPDATE turfs SET sport_type = sport_type_new::sporttype")

    # 8. Set NOT NULL and drop temp column
    op.alter_column('turfs', 'sport_type', nullable=False)
    op.drop_column('turfs', 'sport_type_new')

    # 9. Restore the index
    op.create_index(op.f('ix_turfs_sport_type'), 'turfs', ['sport_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_turfs_sport_type'), table_name='turfs')

    op.add_column('turfs', sa.Column('sport_type_old', sa.Text, nullable=True))
    op.execute("UPDATE turfs SET sport_type_old = 'multi'")
    op.drop_column('turfs', 'sport_type')

    op.execute(f"DROP TYPE IF EXISTS {TYPE_NAME}")

    old_enum = sa.Enum(*OLD_ENUM_VALUES, name=TYPE_NAME)
    old_enum.create(op.get_bind())

    op.add_column('turfs', sa.Column('sport_type', sa.Enum(*OLD_ENUM_VALUES, name=TYPE_NAME), nullable=True))
    op.execute("UPDATE turfs SET sport_type = sport_type_old::sporttype")
    op.alter_column('turfs', 'sport_type', nullable=False)
    op.drop_column('turfs', 'sport_type_old')

    op.create_index(op.f('ix_turfs_sport_type'), 'turfs', ['sport_type'], unique=False)
