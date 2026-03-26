"""Add name and email to users table

Revision ID: 002_user_profile
Revises: 001_initial
Create Date: 2026-02-20

"""
from alembic import op
import sqlalchemy as sa

revision = '002_user_profile'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('name', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('email', sa.String(255), nullable=True))
    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    op.create_index('ix_users_email', 'users', ['email'])


def downgrade() -> None:
    op.drop_index('ix_users_email', table_name='users')
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_column('users', 'email')
    op.drop_column('users', 'name')
