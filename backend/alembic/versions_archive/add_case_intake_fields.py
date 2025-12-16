"""Add intake and reporter fields to cases table

Revision ID: add_case_intake_fields
Revises: edab28787370
Create Date: 2025-11-28 15:30:00.000000

This migration adds new intake-related fields to the cases table to support
the full case registration workflow from the frontend form:
- intake_channel: How the case was reported
- risk_flags: Array of risk indicators
- platforms_implicated: Social media/tech platforms involved
- lga_state_location: Location in Nigeria
- incident_datetime: When the incident occurred
- reporter_type: Type of reporter
- reporter_name: Reporter's name (if not anonymous)
- reporter_contact: JSONB with phone and email
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_case_intake_fields'
down_revision = 'edab28787370'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add intake and reporter fields to cases table."""
    
    connection = op.get_bind()
    
    # Create enums for new fields
    intake_channel_enum = postgresql.ENUM(
        'WALK_IN', 'HOTLINE', 'EMAIL', 'REFERRAL', 'API', 'ONLINE_FORM', 'PARTNER_AGENCY',
        name='intakechannel'
    )
    intake_channel_enum.create(op.get_bind(), checkfirst=True)
    
    reporter_type_enum = postgresql.ENUM(
        'ANONYMOUS', 'VICTIM', 'PARENT', 'LEA', 'NGO', 'CORPORATE', 'WHISTLEBLOWER',
        name='reportertype'
    )
    reporter_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Add new columns to cases table
    # Intake channel
    op.add_column('cases', sa.Column(
        'intake_channel', 
        intake_channel_enum, 
        nullable=True, 
        server_default='WALK_IN'
    ))
    
    # Risk flags as array of strings
    op.add_column('cases', sa.Column(
        'risk_flags', 
        postgresql.ARRAY(sa.String()), 
        nullable=True
    ))
    
    # Platforms implicated as array of strings
    op.add_column('cases', sa.Column(
        'platforms_implicated', 
        postgresql.ARRAY(sa.String()), 
        nullable=True
    ))
    
    # LGA/State location
    op.add_column('cases', sa.Column(
        'lga_state_location', 
        sa.String(length=255), 
        nullable=True
    ))
    
    # Incident datetime
    op.add_column('cases', sa.Column(
        'incident_datetime', 
        sa.DateTime(timezone=True), 
        nullable=True
    ))
    
    # Reporter type
    op.add_column('cases', sa.Column(
        'reporter_type', 
        reporter_type_enum, 
        nullable=True, 
        server_default='ANONYMOUS'
    ))
    
    # Reporter name
    op.add_column('cases', sa.Column(
        'reporter_name', 
        sa.String(length=255), 
        nullable=True
    ))
    
    # Reporter contact as JSONB
    op.add_column('cases', sa.Column(
        'reporter_contact', 
        postgresql.JSONB(astext_type=sa.Text()), 
        nullable=True
    ))
    
    # Create index for risk_flags for faster filtering
    op.create_index(
        'ix_cases_risk_flags', 
        'cases', 
        ['risk_flags'], 
        unique=False,
        postgresql_using='gin'
    )


def downgrade() -> None:
    """Remove intake and reporter fields from cases table."""
    
    # Drop index
    op.drop_index('ix_cases_risk_flags', table_name='cases')
    
    # Drop columns
    op.drop_column('cases', 'reporter_contact')
    op.drop_column('cases', 'reporter_name')
    op.drop_column('cases', 'reporter_type')
    op.drop_column('cases', 'incident_datetime')
    op.drop_column('cases', 'lga_state_location')
    op.drop_column('cases', 'platforms_implicated')
    op.drop_column('cases', 'risk_flags')
    op.drop_column('cases', 'intake_channel')
    
    # Drop enums
    sa.Enum(name='reportertype').drop(op.get_bind())
    sa.Enum(name='intakechannel').drop(op.get_bind())
