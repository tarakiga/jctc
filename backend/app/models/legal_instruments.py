# Re-exports from app.models.legal for backward compatibility
from app.models.legal import (
    LegalInstrument,
    LegalInstrumentType,
    LegalInstrumentStatus,
)

__all__ = [
    "LegalInstrument",
    "LegalInstrumentType", 
    "LegalInstrumentStatus",
]
