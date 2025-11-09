"""Update CaseStatus enum values manually

Revision ID: update_casestatus_001
Revises: e3df44719336
Create Date: 2025-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'update_casestatus_001'
down_revision: Union[str, Sequence[str], None] = 'e3df44719336'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update CaseStatus enum."""
    
    # PostgreSQL enum migrations require special handling
    # Enum values must be added outside of a transaction in PostgreSQL
    # Check if values already exist before adding
    
    connection = op.get_bind()
    
    # Add new enum values (these happen outside the transaction)
    connection.execute(sa.text("COMMIT"))
    connection.execute(sa.text("ALTER TYPE casestatus ADD VALUE IF NOT EXISTS 'UNDER_INVESTIGATION'"))
    connection.execute(sa.text("ALTER TYPE casestatus ADD VALUE IF NOT EXISTS 'PENDING_PROSECUTION'"))
    connection.execute(sa.text("ALTER TYPE casestatus ADD VALUE IF NOT EXISTS 'IN_COURT'"))
    connection.execute(sa.text("ALTER TYPE casestatus ADD VALUE IF NOT EXISTS 'ARCHIVED'"))
    
    # Now update existing data to map old values to new values
    # SUSPENDED -> UNDER_INVESTIGATION
    op.execute("""
        UPDATE cases 
        SET status = 'UNDER_INVESTIGATION' 
        WHERE status = 'SUSPENDED'
    """)
    
    # PROSECUTION -> PENDING_PROSECUTION
    op.execute("""
        UPDATE cases 
        SET status = 'PENDING_PROSECUTION' 
        WHERE status = 'PROSECUTION'
    """)


def downgrade() -> None:
    """Downgrade schema - revert to old enum values."""
    
    # Map new values back to old values
    op.execute("""
        UPDATE cases 
        SET status = 'SUSPENDED' 
        WHERE status = 'UNDER_INVESTIGATION'
    """)
    
    op.execute("""
        UPDATE cases 
        SET status = 'PROSECUTION' 
        WHERE status = 'PENDING_PROSECUTION'
    """)
    
    # Set any IN_COURT to PROSECUTION
    op.execute("""
        UPDATE cases 
        SET status = 'PROSECUTION' 
        WHERE status = 'IN_COURT'
    """)
    
    # Set any ARCHIVED to CLOSED
    op.execute("""
        UPDATE cases 
        SET status = 'CLOSED' 
        WHERE status = 'ARCHIVED'
    """)
    
    # Note: We cannot easily remove enum values in PostgreSQL
    # They would need to be handled through a more complex migration
    # involving creating a new enum type and migrating data
