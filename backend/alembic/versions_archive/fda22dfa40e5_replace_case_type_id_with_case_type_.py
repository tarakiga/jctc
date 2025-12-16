"""replace_case_type_id_with_case_type_string

Revision ID: fda22dfa40e5
Revises: 8aa7588d5a0f
Create Date: 2025-12-07 04:59:07.077385

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fda22dfa40e5'
down_revision: Union[str, Sequence[str], None] = '8aa7588d5a0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Replace case_type_id with case_type string."""
    # Add new case_type string column
    op.add_column('cases', sa.Column('case_type', sa.String(length=100), nullable=True))
    
    # Migrate existing data: copy case type codes from lookup_case_type to cases.case_type
    op.execute("""
        UPDATE cases 
        SET case_type = lct.code 
        FROM lookup_case_type lct 
        WHERE cases.case_type_id = lct.id
    """)
    
    # Drop the foreign key constraint
    op.drop_constraint('cases_case_type_id_fkey', 'cases', type_='foreignkey')
    
    # Drop the old case_type_id column
    op.drop_column('cases', 'case_type_id')
    
    # Drop the lookup_case_type table (no longer needed)
    op.drop_table('lookup_case_type')


def downgrade() -> None:
    """Downgrade schema: Restore case_type_id FK."""
    # Recreate lookup_case_type table
    op.create_table('lookup_case_type',
        sa.Column('code', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
        sa.Column('label', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
        sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
        sa.PrimaryKeyConstraint('id', name='lookup_case_type_pkey'),
        sa.UniqueConstraint('code', name='lookup_case_type_code_key')
    )
    
    # Add back case_type_id column
    op.add_column('cases', sa.Column('case_type_id', sa.UUID(), autoincrement=False, nullable=True))
    
    # Recreate foreign key
    op.create_foreign_key('cases_case_type_id_fkey', 'cases', 'lookup_case_type', ['case_type_id'], ['id'])
    
    # Drop case_type column
    op.drop_column('cases', 'case_type')
