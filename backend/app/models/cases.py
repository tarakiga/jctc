# Cases module alias for compatibility
# This module re-exports Case model from case module

from app.models.case import Case

__all__ = ["Case"]