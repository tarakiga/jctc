import json
from typing import Any, List, Optional
from uuid import UUID as _UUID

from sqlalchemy.types import TypeDecorator, TEXT

class StringArray(TypeDecorator):
    """Cross-dialect list-of-strings type stored as JSON TEXT.
    Portable alternative to PostgreSQL ARRAY(TEXT) for SQLite tests.
    """
    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value: Optional[List[str]], dialect) -> Optional[str]:
        if value is None:
            return None
        if not isinstance(value, list):
            raise TypeError("StringArray expects a list of strings or None")
        return json.dumps(value)

    def process_result_value(self, value: Optional[str], dialect) -> Optional[List[str]]:
        if value is None:
            return None
        try:
            data = json.loads(value)
            if isinstance(data, list):
                return data
            return None
        except Exception:
            return None


class UUIDArray(TypeDecorator):
    """Cross-dialect list-of-UUIDs type stored as JSON TEXT."""
    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value: Optional[List[Any]], dialect) -> Optional[str]:
        if value is None:
            return None
        if not isinstance(value, list):
            raise TypeError("UUIDArray expects a list or None")
        # Normalize to strings
        norm = [str(v) if isinstance(v, (_UUID, str)) else str(v) for v in value]
        return json.dumps(norm)

    def process_result_value(self, value: Optional[str], dialect) -> Optional[List[str]]:
        if value is None:
            return None
        try:
            data = json.loads(value)
            if isinstance(data, list):
                return [str(v) for v in data]
            return None
        except Exception:
            return None
