"""
Field-level encryption utilities for PII protection.

This module provides Fernet-based encryption for sensitive fields
like reporter contact info, victim PII, and other personal data.
"""
import os
import json
from typing import Optional, Any, Dict
from cryptography.fernet import Fernet
from base64 import urlsafe_b64encode, urlsafe_b64decode
import hashlib


class FieldEncryption:
    """
    Fernet-based field-level encryption for PII fields.
    
    Uses AES-128-CBC encryption with HMAC for authentication.
    Keys should be stored in environment variables or KMS.
    """
    
    def __init__(self, encryption_key: Optional[bytes] = None):
        """
        Initialize encryption with provided key or generate from environment.
        
        Args:
            encryption_key: 32-byte base64-encoded Fernet key.
                           If not provided, uses FIELD_ENCRYPTION_KEY env var.
        """
        if encryption_key:
            self.key = encryption_key
        else:
            # Try to get from environment
            env_key = os.environ.get('FIELD_ENCRYPTION_KEY')
            if env_key:
                self.key = env_key.encode() if isinstance(env_key, str) else env_key
            else:
                # Generate a new key (should be saved for production!)
                self.key = Fernet.generate_key()
        
        self.fernet = Fernet(self.key)
    
    @classmethod
    def generate_key(cls) -> str:
        """Generate a new Fernet encryption key."""
        return Fernet.generate_key().decode()
    
    def encrypt_field(self, value: str) -> str:
        """
        Encrypt a string field value.
        
        Args:
            value: Plain text string to encrypt
            
        Returns:
            Base64-encoded encrypted string with 'enc:' prefix
        """
        if not value:
            return value
        
        encrypted = self.fernet.encrypt(value.encode())
        return f"enc:{encrypted.decode()}"
    
    def decrypt_field(self, encrypted_value: str) -> str:
        """
        Decrypt an encrypted field value.
        
        Args:
            encrypted_value: Encrypted string with 'enc:' prefix
            
        Returns:
            Decrypted plain text string
        """
        if not encrypted_value:
            return encrypted_value
        
        # Check if value is encrypted (has prefix)
        if not encrypted_value.startswith('enc:'):
            return encrypted_value  # Return as-is if not encrypted
        
        encrypted_data = encrypted_value[4:]  # Remove 'enc:' prefix
        decrypted = self.fernet.decrypt(encrypted_data.encode())
        return decrypted.decode()
    
    def encrypt_json(self, data: Dict[str, Any]) -> str:
        """
        Encrypt a JSON object.
        
        Args:
            data: Dictionary to encrypt
            
        Returns:
            Base64-encoded encrypted JSON string with 'encj:' prefix
        """
        if not data:
            return None
        
        json_str = json.dumps(data)
        encrypted = self.fernet.encrypt(json_str.encode())
        return f"encj:{encrypted.decode()}"
    
    def decrypt_json(self, encrypted_value: str) -> Dict[str, Any]:
        """
        Decrypt an encrypted JSON object.
        
        Args:
            encrypted_value: Encrypted JSON string with 'encj:' prefix
            
        Returns:
            Decrypted dictionary
        """
        if not encrypted_value:
            return {}
        
        # Check if value is encrypted (has prefix)
        if not encrypted_value.startswith('encj:'):
            # Try to parse as regular JSON
            if isinstance(encrypted_value, str):
                try:
                    return json.loads(encrypted_value)
                except json.JSONDecodeError:
                    return {}
            return encrypted_value
        
        encrypted_data = encrypted_value[5:]  # Remove 'encj:' prefix
        decrypted = self.fernet.decrypt(encrypted_data.encode())
        return json.loads(decrypted.decode())
    
    def is_encrypted(self, value: str) -> bool:
        """Check if a value is encrypted."""
        if not value or not isinstance(value, str):
            return False
        return value.startswith('enc:') or value.startswith('encj:')
    
    def hash_for_search(self, value: str) -> str:
        """
        Create a searchable hash of a value.
        
        Use this to enable searching encrypted fields without decryption.
        Store the hash alongside the encrypted value.
        
        Args:
            value: Plain text value to hash
            
        Returns:
            SHA-256 hash of the value
        """
        if not value:
            return None
        return hashlib.sha256(value.encode()).hexdigest()


# Singleton instance for application-wide use
_encryption_instance: Optional[FieldEncryption] = None


def get_field_encryption() -> FieldEncryption:
    """Get or create the singleton encryption instance."""
    global _encryption_instance
    if _encryption_instance is None:
        _encryption_instance = FieldEncryption()
    return _encryption_instance


def encrypt_pii(value: str) -> str:
    """Convenience function to encrypt a PII field."""
    return get_field_encryption().encrypt_field(value)


def decrypt_pii(encrypted_value: str) -> str:
    """Convenience function to decrypt a PII field."""
    return get_field_encryption().decrypt_field(encrypted_value)


def encrypt_contact_info(contact: Dict[str, Any]) -> str:
    """Encrypt contact information JSON."""
    return get_field_encryption().encrypt_json(contact)


def decrypt_contact_info(encrypted_contact: str) -> Dict[str, Any]:
    """Decrypt contact information JSON."""
    return get_field_encryption().decrypt_json(encrypted_contact)
