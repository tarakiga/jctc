# Users module alias for compatibility
# This module re-exports User model from user module

from app.models.user import User

__all__ = ["User"]