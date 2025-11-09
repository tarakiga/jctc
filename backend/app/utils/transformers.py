"""
Data transformation utilities for the JCTC Integration API system.

This module provides comprehensive data transformation functionality including:
- Field mapping engine for external system integration
- Data transformation rules (formatting, replacement, validation)
- Custom transformation functions and templates
- Schema validation and error handling
- Support for multiple data formats (JSON, XML, CSV)
"""

import json
import re
import logging
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import Any, Dict, List, Optional, Union, Callable
from xml.etree.ElementTree import Element, SubElement, tostring as xml_tostring

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)


class TransformationType(str, Enum):
    """Types of data transformations."""
    
    # Basic transformations
    REPLACE = "replace"
    FORMAT_STRING = "format_string"
    FORMAT_DATE = "format_date"
    FORMAT_NUMBER = "format_number"
    
    # Type conversions
    TO_STRING = "to_string"
    TO_INTEGER = "to_integer"
    TO_FLOAT = "to_float"
    TO_BOOLEAN = "to_boolean"
    TO_DATE = "to_date"
    
    # String operations
    UPPERCASE = "uppercase"
    LOWERCASE = "lowercase"
    CAPITALIZE = "capitalize"
    TRIM = "trim"
    SUBSTRING = "substring"
    
    # List operations
    JOIN = "join"
    SPLIT = "split"
    FILTER = "filter"
    
    # Conditional transformations
    CONDITIONAL = "conditional"
    DEFAULT_VALUE = "default_value"
    NULL_IF_EMPTY = "null_if_empty"
    
    # Custom function
    CUSTOM = "custom"


class ValidationRule(BaseModel):
    """Data validation rule configuration."""
    
    type: str  # required, optional, pattern, range, etc.
    parameters: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    severity: str = "error"  # error, warning, info


class TransformationRule(BaseModel):
    """Individual transformation rule configuration."""
    
    type: TransformationType
    parameters: Dict[str, Any] = Field(default_factory=dict)
    condition: Optional[str] = None  # Conditional expression
    order: int = 0  # Execution order


class FieldMapping(BaseModel):
    """Field mapping configuration."""
    
    source_field: str
    target_field: str
    transformations: List[TransformationRule] = Field(default_factory=list)
    validation_rules: List[ValidationRule] = Field(default_factory=list)
    required: bool = False
    default_value: Optional[Any] = None


class MappingConfiguration(BaseModel):
    """Complete mapping configuration for data transformation."""
    
    name: str
    description: Optional[str] = None
    source_system: str
    target_system: str
    field_mappings: List[FieldMapping]
    global_transformations: List[TransformationRule] = Field(default_factory=list)
    validation_mode: str = "strict"  # strict, lenient, skip
    error_handling: str = "fail_fast"  # fail_fast, collect_errors, ignore


class TransformationError(Exception):
    """Custom exception for transformation errors."""
    
    def __init__(self, field: str, value: Any, rule: str, message: str):
        self.field = field
        self.value = value
        self.rule = rule
        self.message = message
        super().__init__(f"Transformation error in field '{field}': {message}")


class ValidationError(Exception):
    """Custom exception for validation errors."""
    
    def __init__(self, field: str, value: Any, rule: str, message: str):
        self.field = field
        self.value = value
        self.rule = rule
        self.message = message
        super().__init__(f"Validation error in field '{field}': {message}")


class TransformationResult(BaseModel):
    """Result of data transformation operation."""
    
    success: bool
    transformed_data: Dict[str, Any] = Field(default_factory=dict)
    validation_errors: List[Dict[str, Any]] = Field(default_factory=list)
    transformation_errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DataTransformer:
    """Core data transformation engine."""
    
    def __init__(self):
        self.custom_functions: Dict[str, Callable] = {}
        self.register_default_functions()
    
    def register_default_functions(self):
        """Register default transformation functions."""
        
        self.custom_functions.update({
            'format_case_number': self._format_case_number,
            'format_nigerian_phone': self._format_nigerian_phone,
            'extract_initials': self._extract_initials,
            'calculate_age': self._calculate_age,
            'format_currency_ngn': self._format_currency_ngn,
            'normalize_state_name': self._normalize_state_name,
            'extract_domain': self._extract_domain,
            'hash_sensitive_data': self._hash_sensitive_data
        })
    
    def register_custom_function(self, name: str, func: Callable):
        """Register a custom transformation function."""
        self.custom_functions[name] = func
    
    def transform_data(
        self,
        source_data: Dict[str, Any],
        mapping_config: MappingConfiguration
    ) -> TransformationResult:
        """
        Transform data according to mapping configuration.
        
        Args:
            source_data: Source data dictionary
            mapping_config: Transformation mapping configuration
            
        Returns:
            TransformationResult with transformed data and any errors
        """
        
        result = TransformationResult(success=True)
        transformed_data = {}
        errors = []
        warnings = []
        
        # Apply global transformations first
        processed_source = source_data.copy()
        for transformation in mapping_config.global_transformations:
            try:
                processed_source = self._apply_global_transformation(
                    processed_source, transformation
                )
            except Exception as e:
                error_info = {
                    'type': 'global_transformation_error',
                    'transformation': transformation.type,
                    'message': str(e)
                }
                errors.append(error_info)
        
        # Process field mappings
        for field_mapping in mapping_config.field_mappings:
            try:
                # Get source value
                source_value = self._get_nested_value(
                    processed_source, field_mapping.source_field
                )
                
                # Apply default value if source is None/missing
                if source_value is None and field_mapping.default_value is not None:
                    source_value = field_mapping.default_value
                
                # Skip if required field is missing
                if source_value is None and field_mapping.required:
                    error_info = {
                        'type': 'required_field_missing',
                        'field': field_mapping.source_field,
                        'target_field': field_mapping.target_field,
                        'message': f'Required field {field_mapping.source_field} is missing'
                    }
                    errors.append(error_info)
                    continue
                
                # Skip if optional field is missing
                if source_value is None:
                    continue
                
                # Apply transformations
                transformed_value = source_value
                for transformation in sorted(field_mapping.transformations, key=lambda x: x.order):
                    try:
                        # Check condition if specified
                        if transformation.condition:
                            if not self._evaluate_condition(
                                transformation.condition, 
                                source_value, 
                                processed_source
                            ):
                                continue
                        
                        transformed_value = self._apply_transformation(
                            transformed_value, transformation
                        )
                    except TransformationError as e:
                        error_info = {
                            'type': 'transformation_error',
                            'field': field_mapping.source_field,
                            'target_field': field_mapping.target_field,
                            'transformation': transformation.type,
                            'message': str(e)
                        }
                        errors.append(error_info)
                        
                        if mapping_config.error_handling == "fail_fast":
                            result.success = False
                            result.transformation_errors = errors
                            return result
                        
                        # Use original value if transformation fails
                        transformed_value = source_value
                
                # Apply validation rules
                for validation_rule in field_mapping.validation_rules:
                    try:
                        validation_result = self._validate_value(
                            transformed_value, validation_rule
                        )
                        
                        if not validation_result['valid']:
                            error_info = {
                                'type': 'validation_error',
                                'field': field_mapping.target_field,
                                'value': transformed_value,
                                'rule': validation_rule.type,
                                'message': validation_result['message'],
                                'severity': validation_rule.severity
                            }
                            
                            if validation_rule.severity == "error":
                                errors.append(error_info)
                                if mapping_config.validation_mode == "strict":
                                    result.success = False
                            else:
                                warnings.append(error_info)
                    
                    except ValidationError as e:
                        error_info = {
                            'type': 'validation_error',
                            'field': field_mapping.target_field,
                            'message': str(e)
                        }
                        errors.append(error_info)
                
                # Set transformed value
                self._set_nested_value(
                    transformed_data, 
                    field_mapping.target_field, 
                    transformed_value
                )
                
            except Exception as e:
                error_info = {
                    'type': 'field_mapping_error',
                    'field': field_mapping.source_field,
                    'target_field': field_mapping.target_field,
                    'message': str(e)
                }
                errors.append(error_info)
        
        # Set result data
        result.transformed_data = transformed_data
        result.transformation_errors = errors
        result.warnings = warnings
        result.metadata = {
            'source_system': mapping_config.source_system,
            'target_system': mapping_config.target_system,
            'mapping_name': mapping_config.name,
            'transformation_time': datetime.utcnow().isoformat(),
            'fields_processed': len(mapping_config.field_mappings),
            'fields_transformed': len(transformed_data),
            'errors_count': len(errors),
            'warnings_count': len(warnings)
        }
        
        # Determine final success status
        if errors and mapping_config.validation_mode == "strict":
            result.success = False
        
        return result
    
    def _get_nested_value(self, data: Dict[str, Any], field_path: str) -> Any:
        """Get value from nested dictionary using dot notation."""
        
        keys = field_path.split('.')
        value = data
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value
    
    def _set_nested_value(self, data: Dict[str, Any], field_path: str, value: Any):
        """Set value in nested dictionary using dot notation."""
        
        keys = field_path.split('.')
        current = data
        
        # Navigate to parent of target key
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        # Set the final value
        current[keys[-1]] = value
    
    def _apply_transformation(self, value: Any, rule: TransformationRule) -> Any:
        """Apply a single transformation rule to a value."""
        
        # Handle None values specially for DEFAULT_VALUE and NULL_IF_EMPTY transformations
        if value is None and rule.type not in [TransformationType.DEFAULT_VALUE, TransformationType.NULL_IF_EMPTY]:
            return value
        
        try:
            if rule.type == TransformationType.REPLACE:
                return str(value).replace(
                    rule.parameters.get('from', ''),
                    rule.parameters.get('to', '')
                )
            
            elif rule.type == TransformationType.FORMAT_STRING:
                return rule.parameters.get('format', '{}').format(value)
            
            elif rule.type == TransformationType.FORMAT_DATE:
                if isinstance(value, str):
                    # Parse string to datetime first
                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                elif isinstance(value, datetime):
                    dt = value
                else:
                    raise TransformationError("", value, rule.type, "Invalid date value")
                
                return dt.strftime(rule.parameters.get('format', '%Y-%m-%d'))
            
            elif rule.type == TransformationType.FORMAT_NUMBER:
                num = float(value)
                decimals = rule.parameters.get('decimals', 2)
                return f"{num:.{decimals}f}"
            
            elif rule.type == TransformationType.TO_STRING:
                return str(value)
            
            elif rule.type == TransformationType.TO_INTEGER:
                return int(float(value))  # Handle string numbers
            
            elif rule.type == TransformationType.TO_FLOAT:
                return float(value)
            
            elif rule.type == TransformationType.TO_BOOLEAN:
                if isinstance(value, bool):
                    return value
                if isinstance(value, str):
                    return value.lower() in ('true', '1', 'yes', 'on')
                return bool(value)
            
            elif rule.type == TransformationType.TO_DATE:
                if isinstance(value, datetime):
                    return value.date()
                if isinstance(value, str):
                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    return dt.date()
                raise TransformationError("", value, rule.type, "Invalid date value")
            
            elif rule.type == TransformationType.UPPERCASE:
                return str(value).upper()
            
            elif rule.type == TransformationType.LOWERCASE:
                return str(value).lower()
            
            elif rule.type == TransformationType.CAPITALIZE:
                return str(value).capitalize()
            
            elif rule.type == TransformationType.TRIM:
                return str(value).strip()
            
            elif rule.type == TransformationType.SUBSTRING:
                start = rule.parameters.get('start', 0)
                end = rule.parameters.get('end')
                return str(value)[start:end] if end else str(value)[start:]
            
            elif rule.type == TransformationType.JOIN:
                if isinstance(value, list):
                    separator = rule.parameters.get('separator', ', ')
                    return separator.join(str(item) for item in value)
                return str(value)
            
            elif rule.type == TransformationType.SPLIT:
                separator = rule.parameters.get('separator', ',')
                return str(value).split(separator)
            
            elif rule.type == TransformationType.DEFAULT_VALUE:
                return rule.parameters.get('default') if value is None else value
            
            elif rule.type == TransformationType.NULL_IF_EMPTY:
                return None if str(value).strip() == '' else value
            
            elif rule.type == TransformationType.CUSTOM:
                func_name = rule.parameters.get('function')
                if func_name in self.custom_functions:
                    return self.custom_functions[func_name](value, rule.parameters)
                raise TransformationError("", value, rule.type, f"Unknown custom function: {func_name}")
            
            else:
                raise TransformationError("", value, rule.type, f"Unknown transformation type: {rule.type}")
                
        except Exception as e:
            raise TransformationError("", value, rule.type, str(e))
    
    def _apply_global_transformation(
        self, 
        data: Dict[str, Any], 
        transformation: TransformationRule
    ) -> Dict[str, Any]:
        """Apply global transformation to entire data structure."""
        
        # Global transformations could modify the entire data structure
        # For now, this is a placeholder for future enhancements
        return data
    
    def _validate_value(self, value: Any, rule: ValidationRule) -> Dict[str, Any]:
        """Validate a value against a validation rule."""
        
        if rule.type == "required":
            valid = value is not None and str(value).strip() != ''
            message = rule.error_message or "Field is required"
        
        elif rule.type == "pattern":
            pattern = rule.parameters.get('regex')
            if pattern:
                valid = bool(re.match(pattern, str(value)))
                message = rule.error_message or f"Value does not match pattern {pattern}"
            else:
                valid = True
                message = ""
        
        elif rule.type == "range":
            try:
                num_value = float(value)
                min_val = rule.parameters.get('min')
                max_val = rule.parameters.get('max')
                
                valid = True
                if min_val is not None:
                    valid = valid and num_value >= min_val
                if max_val is not None:
                    valid = valid and num_value <= max_val
                
                message = rule.error_message or f"Value must be between {min_val} and {max_val}"
            except (ValueError, TypeError):
                valid = False
                message = "Value must be numeric"
        
        elif rule.type == "length":
            min_len = rule.parameters.get('min', 0)
            max_len = rule.parameters.get('max')
            value_len = len(str(value))
            
            valid = value_len >= min_len
            if max_len:
                valid = valid and value_len <= max_len
            
            message = rule.error_message or f"Length must be between {min_len} and {max_len}"
        
        elif rule.type == "in":
            allowed_values = rule.parameters.get('values', [])
            valid = value in allowed_values
            message = rule.error_message or f"Value must be one of: {', '.join(map(str, allowed_values))}"
        
        else:
            valid = True
            message = ""
        
        return {
            'valid': valid,
            'message': message
        }
    
    def _evaluate_condition(
        self, 
        condition: str, 
        current_value: Any, 
        source_data: Dict[str, Any]
    ) -> bool:
        """Evaluate a conditional expression."""
        
        # Simple condition evaluation
        # For production use, consider using a safer expression evaluator
        try:
            # Replace placeholders with actual values
            condition = condition.replace('${value}', repr(current_value))
            for key, val in source_data.items():
                condition = condition.replace(f'${{{key}}}', repr(val))
            
            # Evaluate the condition
            return bool(eval(condition))
        except Exception:
            logger.warning(f"Failed to evaluate condition: {condition}")
            return True  # Default to true if evaluation fails
    
    # Custom transformation functions
    def _format_case_number(self, value: Any, params: Dict[str, Any]) -> str:
        """Format JCTC case number."""
        year = datetime.now().year
        return f"JCTC-{year}-{str(value).zfill(6)}"
    
    def _format_nigerian_phone(self, value: Any, params: Dict[str, Any]) -> str:
        """Format Nigerian phone number."""
        phone = re.sub(r'[^\d]', '', str(value))
        
        if phone.startswith('234'):
            return f"+{phone}"
        elif phone.startswith('0'):
            return f"+234{phone[1:]}"
        else:
            return f"+234{phone}"
    
    def _extract_initials(self, value: Any, params: Dict[str, Any]) -> str:
        """Extract initials from full name."""
        names = str(value).split()
        return ''.join(name[0].upper() for name in names if name)
    
    def _calculate_age(self, value: Any, params: Dict[str, Any]) -> int:
        """Calculate age from birth date."""
        if isinstance(value, str):
            birth_date = datetime.fromisoformat(value.replace('Z', '+00:00')).date()
        elif isinstance(value, datetime):
            birth_date = value.date()
        else:
            birth_date = value
        
        today = date.today()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    
    def _format_currency_ngn(self, value: Any, params: Dict[str, Any]) -> str:
        """Format value as Nigerian Naira currency."""
        try:
            amount = Decimal(str(value))
            return f"₦{amount:,.2f}"
        except InvalidOperation:
            return f"₦0.00"
    
    def _normalize_state_name(self, value: Any, params: Dict[str, Any]) -> str:
        """Normalize Nigerian state names."""
        state_mapping = {
            'fct': 'Federal Capital Territory',
            'abuja': 'Federal Capital Territory',
            'lagos state': 'Lagos',
            'rivers state': 'Rivers',
            # Add more mappings as needed
        }
        
        normalized = str(value).lower().strip()
        return state_mapping.get(normalized, str(value).title())
    
    def _extract_domain(self, value: Any, params: Dict[str, Any]) -> str:
        """Extract domain from email address."""
        email = str(value).strip()
        if '@' in email:
            return email.split('@')[1].lower()
        return ""
    
    def _hash_sensitive_data(self, value: Any, params: Dict[str, Any]) -> str:
        """Hash sensitive data for privacy."""
        import hashlib
        algorithm = params.get('algorithm', 'sha256')
        
        hasher = hashlib.new(algorithm)
        hasher.update(str(value).encode('utf-8'))
        
        return hasher.hexdigest()


class SchemaValidator:
    """Schema validation utilities."""
    
    @staticmethod
    def validate_json_schema(data: Dict[str, Any], schema: Dict[str, Any]) -> List[str]:
        """Validate data against JSON schema (simplified)."""
        errors = []
        
        # Basic schema validation
        if 'required' in schema:
            for field in schema['required']:
                if field not in data:
                    errors.append(f"Required field '{field}' is missing")
        
        if 'properties' in schema:
            for field, field_schema in schema['properties'].items():
                if field in data:
                    value = data[field]
                    field_type = field_schema.get('type')
                    
                    if field_type == 'string' and not isinstance(value, str):
                        errors.append(f"Field '{field}' must be a string")
                    elif field_type == 'integer' and not isinstance(value, int):
                        errors.append(f"Field '{field}' must be an integer")
                    elif field_type == 'number' and not isinstance(value, (int, float)):
                        errors.append(f"Field '{field}' must be a number")
                    elif field_type == 'boolean' and not isinstance(value, bool):
                        errors.append(f"Field '{field}' must be a boolean")
                    elif field_type == 'array' and not isinstance(value, list):
                        errors.append(f"Field '{field}' must be an array")
                    elif field_type == 'object' and not isinstance(value, dict):
                        errors.append(f"Field '{field}' must be an object")
        
        return errors


class FormatConverter:
    """Convert between different data formats."""
    
    @staticmethod
    def dict_to_xml(data: Dict[str, Any], root_name: str = "root") -> str:
        """Convert dictionary to XML string."""
        
        def build_element(parent: Element, key: str, value: Any):
            elem = SubElement(parent, key)
            
            if isinstance(value, dict):
                for k, v in value.items():
                    build_element(elem, k, v)
            elif isinstance(value, list):
                for item in value:
                    build_element(elem, 'item', item)
            else:
                elem.text = str(value)
        
        root = Element(root_name)
        for key, value in data.items():
            build_element(root, key, value)
        
        return xml_tostring(root, encoding='unicode')
    
    @staticmethod
    def dict_to_csv_rows(data_list: List[Dict[str, Any]]) -> List[List[str]]:
        """Convert list of dictionaries to CSV rows."""
        if not data_list:
            return []
        
        # Get all unique keys for headers
        all_keys = set()
        for item in data_list:
            all_keys.update(item.keys())
        
        headers = sorted(all_keys)
        rows = [headers]
        
        for item in data_list:
            row = [str(item.get(key, '')) for key in headers]
            rows.append(row)
        
        return rows


# Global transformer instance
data_transformer = DataTransformer()


# Convenience functions
def transform_data(
    source_data: Dict[str, Any],
    mapping_config: MappingConfiguration
) -> TransformationResult:
    """
    Convenience function to transform data.
    
    Args:
        source_data: Source data dictionary
        mapping_config: Transformation mapping configuration
        
    Returns:
        TransformationResult with transformed data and any errors
    """
    return data_transformer.transform_data(source_data, mapping_config)


def register_custom_transformer(name: str, func: Callable):
    """
    Register a custom transformation function.
    
    Args:
        name: Function name for use in transformations
        func: Callable transformation function
    """
    data_transformer.register_custom_function(name, func)