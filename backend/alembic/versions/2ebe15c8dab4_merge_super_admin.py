"""merge_super_admin

Revision ID: 2ebe15c8dab4
Revises: add_super_admin_role, merge_security_heads
Create Date: 2025-12-14 20:00:55.571133

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2ebe15c8dab4'
down_revision: Union[str, Sequence[str], None] = ('add_super_admin_role', 'merge_security_heads')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
