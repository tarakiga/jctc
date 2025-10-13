# Core dependencies for the JCTC application
# This module re-exports dependencies from app.utils.dependencies for compatibility

from app.utils.dependencies import (
    get_current_user,
    get_current_active_user,
    require_role,
    require_admin,
    require_supervisor_or_admin
)
from app.database.base import get_db

__all__ = [
    "get_db",
    "get_current_user", 
    "get_current_active_user",
    "require_role",
    "require_admin",
    "require_supervisor_or_admin"
]