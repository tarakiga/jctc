"""Add case sensitivity fields for ABAC

Revision ID: abac_case_sensitivity
Revises: ndpa_compliance_001
Create Date: 2024-12-14

Adds sensitivity classification fields to cases table for
Attribute-Based Access Control (ABAC).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'abac_case_sensitivity'
down_revision = 'ndpa_compliance_001'
branch_labels = None
depends_on = None


def upgrade():
    # Create sensitivity_level enum
    sensitivity_level_enum = postgresql.ENUM(
        'NORMAL', 'RESTRICTED', 'CONFIDENTIAL', 'TOP_SECRET',
        name='sensitivitylevel',
        create_type=False
    )
    sensitivity_level_enum.create(op.get_bind(), checkfirst=True)
    
    # Add sensitivity fields to cases table
    op.add_column('cases', sa.Column('is_sensitive', sa.Boolean(), 
                                      nullable=True, server_default='false'))
    op.add_column('cases', sa.Column('sensitivity_level', 
                                      postgresql.ENUM('NORMAL', 'RESTRICTED', 'CONFIDENTIAL', 'TOP_SECRET',
                                                      name='sensitivitylevel', create_type=False),
                                      nullable=True, server_default='NORMAL'))
    op.add_column('cases', sa.Column('access_restrictions', postgresql.JSONB(), 
                                      nullable=True, server_default='{}'))
    op.add_column('cases', sa.Column('sensitivity_reason', sa.Text(), nullable=True))
    op.add_column('cases', sa.Column('marked_sensitive_by', postgresql.UUID(as_uuid=True), 
                                      nullable=True))
    op.add_column('cases', sa.Column('marked_sensitive_at', sa.DateTime(timezone=True), 
                                      nullable=True))
    
    # Add foreign key for marked_sensitive_by
    op.create_foreign_key(
        'fk_cases_marked_sensitive_by_users',
        'cases', 'users',
        ['marked_sensitive_by'], ['id']
    )
    
    # Add index for is_sensitive for faster filtering
    op.create_index('ix_cases_is_sensitive', 'cases', ['is_sensitive'])
    op.create_index('ix_cases_sensitivity_level', 'cases', ['sensitivity_level'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_cases_sensitivity_level', table_name='cases')
    op.drop_index('ix_cases_is_sensitive', table_name='cases')
    
    # Drop foreign key
    op.drop_constraint('fk_cases_marked_sensitive_by_users', 'cases', type_='foreignkey')
    
    # Drop columns
    op.drop_column('cases', 'marked_sensitive_at')
    op.drop_column('cases', 'marked_sensitive_by')
    op.drop_column('cases', 'sensitivity_reason')
    op.drop_column('cases', 'access_restrictions')
    op.drop_column('cases', 'sensitivity_level')
    op.drop_column('cases', 'is_sensitive')
    
    # Drop enum type
    postgresql.ENUM(name='sensitivitylevel').drop(op.get_bind(), checkfirst=True)
