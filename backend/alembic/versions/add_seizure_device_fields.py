"""Add comprehensive fields to seizures and devices tables

Revision ID: add_seizure_device_fields
Revises: e3df44719336
Create Date: 2025-01-11 23:07:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_seizure_device_fields'
down_revision = ('e3df44719336', 'update_casestatus_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade schema with comprehensive seizure and device fields."""
    
    connection = op.get_bind()
    
    # Create enums for new fields
    warrant_type_enum = postgresql.ENUM('SEARCH_WARRANT', 'PRODUCTION_ORDER', 'COURT_ORDER', 'SEIZURE_ORDER', name='warranttype')
    warrant_type_enum.create(op.get_bind(), checkfirst=True)
    
    seizure_status_enum = postgresql.ENUM('PENDING', 'COMPLETED', 'DISPUTED', 'RETURNED', name='seizurestatus')
    seizure_status_enum.create(op.get_bind(), checkfirst=True)
    
    device_condition_enum = postgresql.ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', name='devicecondition')
    device_condition_enum.create(op.get_bind(), checkfirst=True)
    
    encryption_status_enum = postgresql.ENUM('NONE', 'ENCRYPTED', 'BITLOCKER', 'FILEVAULT', 'PARTIAL', 'UNKNOWN', name='encryptionstatus')
    encryption_status_enum.create(op.get_bind(), checkfirst=True)
    
    analysis_status_enum = postgresql.ENUM('PENDING', 'IN_PROGRESS', 'ANALYZED', 'BLOCKED', name='analysisstatus')
    analysis_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Update device_type enum to add new values (devicetype already exists from prior migration)
    connection.execute(sa.text("COMMIT"))
    connection.execute(sa.text("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'DESKTOP'"))
    connection.execute(sa.text("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'EXTERNAL_STORAGE'"))
    connection.execute(sa.text("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'MEMORY_CARD'"))
    connection.execute(sa.text("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'SERVER'"))
    connection.execute(sa.text("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'NETWORK_DEVICE'"))
    
    # Add new columns to seizures table
    op.add_column('seizures', sa.Column('warrant_number', sa.String(length=100), nullable=True))
    op.add_column('seizures', sa.Column('warrant_type', warrant_type_enum, nullable=True))
    op.add_column('seizures', sa.Column('issuing_authority', sa.String(length=255), nullable=True))
    op.add_column('seizures', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('seizures', sa.Column('items_count', sa.Integer(), nullable=True))
    op.add_column('seizures', sa.Column('status', seizure_status_enum, nullable=True, server_default='COMPLETED'))
    op.add_column('seizures', sa.Column('witnesses', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('seizures', sa.Column('photos', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    # Add new columns to devices table (device_type already exists, skip it)
    op.add_column('devices', sa.Column('storage_capacity', sa.String(length=100), nullable=True))
    op.add_column('devices', sa.Column('operating_system', sa.String(length=100), nullable=True))
    op.add_column('devices', sa.Column('condition', device_condition_enum, nullable=True))
    op.add_column('devices', sa.Column('powered_on', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('devices', sa.Column('password_protected', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('devices', sa.Column('encryption_status', encryption_status_enum, nullable=True, server_default='UNKNOWN'))
    op.add_column('devices', sa.Column('forensic_notes', sa.Text(), nullable=True))
    op.add_column('devices', sa.Column('status', analysis_status_enum, nullable=True, server_default='PENDING'))
    op.add_column('devices', sa.Column('case_id', sa.UUID(), nullable=True))
    
    # Add foreign key for case_id in devices
    op.create_foreign_key('fk_devices_case_id', 'devices', 'cases', ['case_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema by removing added fields."""
    
    # Remove foreign key first
    op.drop_constraint('fk_devices_case_id', 'devices', type_='foreignkey')
    
    # Drop columns from devices table (keep device_type as it existed before)
    op.drop_column('devices', 'case_id')
    op.drop_column('devices', 'status')
    op.drop_column('devices', 'forensic_notes')
    op.drop_column('devices', 'encryption_status')
    op.drop_column('devices', 'password_protected')
    op.drop_column('devices', 'powered_on')
    op.drop_column('devices', 'condition')
    op.drop_column('devices', 'operating_system')
    op.drop_column('devices', 'storage_capacity')
    
    # Drop columns from seizures table
    op.drop_column('seizures', 'photos')
    op.drop_column('seizures', 'witnesses')
    op.drop_column('seizures', 'status')
    op.drop_column('seizures', 'items_count')
    op.drop_column('seizures', 'description')
    op.drop_column('seizures', 'issuing_authority')
    op.drop_column('seizures', 'warrant_type')
    op.drop_column('seizures', 'warrant_number')
    
    # Drop new enums (keep devicetype as it existed before)
    sa.Enum(name='analysisstatus').drop(op.get_bind())
    sa.Enum(name='encryptionstatus').drop(op.get_bind())
    sa.Enum(name='devicecondition').drop(op.get_bind())
    sa.Enum(name='seizurestatus').drop(op.get_bind())
    sa.Enum(name='warranttype').drop(op.get_bind())
