"""
Unit tests for data transformation utilities.

This module tests:
- Field mapping engine and data transformation
- Transformation rules and custom functions
- Data validation and error handling
- Format conversion utilities
- Schema validation
"""

import pytest
from datetime import datetime, date
from decimal import Decimal
from unittest.mock import Mock, patch

from app.utils.transformers import (
    DataTransformer,
    MappingConfiguration,
    FieldMapping,
    TransformationRule,
    ValidationRule,
    TransformationType,
    TransformationResult,
    TransformationError,
    ValidationError,
    SchemaValidator,
    FormatConverter,
    transform_data,
    register_custom_transformer
)


class TestDataTransformer:
    """Test data transformation engine."""
    
    @pytest.fixture
    def transformer(self):
        """Fixture providing data transformer instance."""
        return DataTransformer()
    
    @pytest.fixture
    def simple_mapping_config(self):
        """Fixture providing simple mapping configuration."""
        return MappingConfiguration(
            name="Test Mapping",
            source_system="test_source",
            target_system="test_target",
            field_mappings=[
                FieldMapping(
                    source_field="source_name",
                    target_field="target_name",
                    transformations=[
                        TransformationRule(
                            type=TransformationType.UPPERCASE,
                            order=1
                        )
                    ]
                ),
                FieldMapping(
                    source_field="source_age",
                    target_field="target_age",
                    transformations=[
                        TransformationRule(
                            type=TransformationType.TO_INTEGER,
                            order=1
                        )
                    ]
                )
            ]
        )
    
    def test_simple_transformation(self, transformer, simple_mapping_config):
        """Test simple field transformation."""
        source_data = {
            "source_name": "john doe",
            "source_age": "25"
        }
        
        result = transformer.transform_data(source_data, simple_mapping_config)
        
        assert result.success is True
        assert result.transformed_data["target_name"] == "JOHN DOE"
        assert result.transformed_data["target_age"] == 25
        assert len(result.transformation_errors) == 0
    
    def test_nested_field_mapping(self, transformer):
        """Test nested field access and mapping."""
        mapping_config = MappingConfiguration(
            name="Nested Mapping",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="user.profile.name",
                    target_field="full_name"
                ),
                FieldMapping(
                    source_field="user.contact.email",
                    target_field="email"
                )
            ]
        )
        
        source_data = {
            "user": {
                "profile": {"name": "Jane Smith"},
                "contact": {"email": "jane@example.com"}
            }
        }
        
        result = transformer.transform_data(source_data, mapping_config)
        
        assert result.success is True
        assert result.transformed_data["full_name"] == "Jane Smith"
        assert result.transformed_data["email"] == "jane@example.com"
    
    def test_required_field_missing(self, transformer):
        """Test required field validation."""
        mapping_config = MappingConfiguration(
            name="Required Field Test",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="required_field",
                    target_field="output_field",
                    required=True
                )
            ]
        )
        
        source_data = {"other_field": "value"}
        
        result = transformer.transform_data(source_data, mapping_config)
        
        assert result.success is False
        assert len(result.transformation_errors) == 1
        assert "required_field_missing" in result.transformation_errors[0]['type']
    
    def test_default_value_application(self, transformer):
        """Test default value when source field is missing."""
        mapping_config = MappingConfiguration(
            name="Default Value Test",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="missing_field",
                    target_field="output_field",
                    default_value="default_value"
                )
            ]
        )
        
        source_data = {"other_field": "value"}
        
        result = transformer.transform_data(source_data, mapping_config)
        
        assert result.success is True
        assert result.transformed_data["output_field"] == "default_value"
    
    def test_multiple_transformations_order(self, transformer):
        """Test multiple transformations applied in correct order."""
        mapping_config = MappingConfiguration(
            name="Multiple Transformations",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="text",
                    target_field="processed_text",
                    transformations=[
                        TransformationRule(
                            type=TransformationType.TRIM,
                            order=1
                        ),
                        TransformationRule(
                            type=TransformationType.UPPERCASE,
                            order=2
                        ),
                        TransformationRule(
                            type=TransformationType.REPLACE,
                            parameters={"from": "HELLO", "to": "HI"},
                            order=3
                        )
                    ]
                )
            ]
        )
        
        source_data = {"text": "  hello world  "}
        
        result = transformer.transform_data(source_data, mapping_config)
        
        assert result.success is True
        assert result.transformed_data["processed_text"] == "HI WORLD"
    
    def test_conditional_transformation(self, transformer):
        """Test conditional transformation execution."""
        mapping_config = MappingConfiguration(
            name="Conditional Transform",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="status",
                    target_field="formatted_status",
                    transformations=[
                        TransformationRule(
                            type=TransformationType.UPPERCASE,
                            condition="${value} == 'active'",
                            order=1
                        )
                    ]
                )
            ]
        )
        
        # Test condition matches
        source_data = {"status": "active"}
        result = transformer.transform_data(source_data, mapping_config)
        assert result.transformed_data["formatted_status"] == "ACTIVE"
        
        # Test condition doesn't match
        source_data = {"status": "inactive"}
        result = transformer.transform_data(source_data, mapping_config)
        assert result.transformed_data["formatted_status"] == "inactive"


class TestTransformationRules:
    """Test individual transformation rules."""
    
    @pytest.fixture
    def transformer(self):
        """Fixture providing data transformer instance."""
        return DataTransformer()
    
    def test_replace_transformation(self, transformer):
        """Test replace transformation."""
        rule = TransformationRule(
            type=TransformationType.REPLACE,
            parameters={"from": "old", "to": "new"}
        )
        
        result = transformer._apply_transformation("old text old", rule)
        assert result == "new text new"
    
    def test_format_string_transformation(self, transformer):
        """Test format string transformation."""
        rule = TransformationRule(
            type=TransformationType.FORMAT_STRING,
            parameters={"format": "Value: {}"}
        )
        
        result = transformer._apply_transformation("test", rule)
        assert result == "Value: test"
    
    def test_format_date_transformation(self, transformer):
        """Test date formatting transformation."""
        rule = TransformationRule(
            type=TransformationType.FORMAT_DATE,
            parameters={"format": "%Y-%m-%d"}
        )
        
        # Test with datetime object
        dt = datetime(2023, 10, 7, 14, 30, 0)
        result = transformer._apply_transformation(dt, rule)
        assert result == "2023-10-07"
        
        # Test with ISO string
        iso_string = "2023-10-07T14:30:00Z"
        result = transformer._apply_transformation(iso_string, rule)
        assert result == "2023-10-07"
    
    def test_type_conversions(self, transformer):
        """Test type conversion transformations."""
        # String to integer
        rule = TransformationRule(type=TransformationType.TO_INTEGER)
        assert transformer._apply_transformation("42", rule) == 42
        assert transformer._apply_transformation("42.7", rule) == 42
        
        # String to float
        rule = TransformationRule(type=TransformationType.TO_FLOAT)
        assert transformer._apply_transformation("42.7", rule) == 42.7
        
        # To boolean
        rule = TransformationRule(type=TransformationType.TO_BOOLEAN)
        assert transformer._apply_transformation("true", rule) is True
        assert transformer._apply_transformation("false", rule) is False
        assert transformer._apply_transformation("1", rule) is True
        assert transformer._apply_transformation("0", rule) is False
    
    def test_string_operations(self, transformer):
        """Test string operation transformations."""
        # Uppercase
        rule = TransformationRule(type=TransformationType.UPPERCASE)
        assert transformer._apply_transformation("hello", rule) == "HELLO"
        
        # Lowercase
        rule = TransformationRule(type=TransformationType.LOWERCASE)
        assert transformer._apply_transformation("HELLO", rule) == "hello"
        
        # Capitalize
        rule = TransformationRule(type=TransformationType.CAPITALIZE)
        assert transformer._apply_transformation("hello world", rule) == "Hello world"
        
        # Trim
        rule = TransformationRule(type=TransformationType.TRIM)
        assert transformer._apply_transformation("  hello  ", rule) == "hello"
        
        # Substring
        rule = TransformationRule(
            type=TransformationType.SUBSTRING,
            parameters={"start": 2, "end": 5}
        )
        assert transformer._apply_transformation("hello world", rule) == "llo"
    
    def test_list_operations(self, transformer):
        """Test list operation transformations."""
        # Join
        rule = TransformationRule(
            type=TransformationType.JOIN,
            parameters={"separator": ", "}
        )
        assert transformer._apply_transformation(["a", "b", "c"], rule) == "a, b, c"
        
        # Split
        rule = TransformationRule(
            type=TransformationType.SPLIT,
            parameters={"separator": ","}
        )
        assert transformer._apply_transformation("a,b,c", rule) == ["a", "b", "c"]
    
    def test_null_handling(self, transformer):
        """Test null handling transformations."""
        # Default value
        rule = TransformationRule(
            type=TransformationType.DEFAULT_VALUE,
            parameters={"default": "fallback"}
        )
        assert transformer._apply_transformation(None, rule) == "fallback"
        assert transformer._apply_transformation("value", rule) == "value"
        
        # Null if empty
        rule = TransformationRule(type=TransformationType.NULL_IF_EMPTY)
        assert transformer._apply_transformation("", rule) is None
        assert transformer._apply_transformation("   ", rule) is None
        assert transformer._apply_transformation("value", rule) == "value"


class TestCustomTransformationFunctions:
    """Test custom transformation functions."""
    
    @pytest.fixture
    def transformer(self):
        """Fixture providing data transformer instance."""
        return DataTransformer()
    
    def test_format_case_number(self, transformer):
        """Test JCTC case number formatting."""
        result = transformer._format_case_number("123", {})
        current_year = datetime.now().year
        expected = f"JCTC-{current_year}-000123"
        assert result == expected
    
    def test_format_nigerian_phone(self, transformer):
        """Test Nigerian phone number formatting."""
        # Test with local format
        result = transformer._format_nigerian_phone("08012345678", {})
        assert result == "+2348012345678"
        
        # Test with international format
        result = transformer._format_nigerian_phone("2348012345678", {})
        assert result == "+2348012345678"
        
        # Test with spaces and dashes
        result = transformer._format_nigerian_phone("0801-234-5678", {})
        assert result == "+2348012345678"
    
    def test_extract_initials(self, transformer):
        """Test initials extraction."""
        result = transformer._extract_initials("John Doe Smith", {})
        assert result == "JDS"
    
    def test_calculate_age(self, transformer):
        """Test age calculation from birth date."""
        # Test with date object
        birth_date = date(1990, 5, 15)
        result = transformer._calculate_age(birth_date, {})
        expected_age = date.today().year - 1990
        if date.today() < date(date.today().year, 5, 15):
            expected_age -= 1
        assert result == expected_age
    
    def test_format_currency_ngn(self, transformer):
        """Test Nigerian Naira currency formatting."""
        result = transformer._format_currency_ngn(1234567.89, {})
        assert result == "₦1,234,567.89"
        
        # Test with invalid input
        result = transformer._format_currency_ngn("invalid", {})
        assert result == "₦0.00"
    
    def test_normalize_state_name(self, transformer):
        """Test Nigerian state name normalization."""
        result = transformer._normalize_state_name("fct", {})
        assert result == "Federal Capital Territory"
        
        result = transformer._normalize_state_name("lagos state", {})
        assert result == "Lagos"
        
        result = transformer._normalize_state_name("Unknown State", {})
        assert result == "Unknown State"
    
    def test_extract_domain(self, transformer):
        """Test email domain extraction."""
        result = transformer._extract_domain("user@example.com", {})
        assert result == "example.com"
        
        result = transformer._extract_domain("invalid_email", {})
        assert result == ""
    
    def test_hash_sensitive_data(self, transformer):
        """Test sensitive data hashing."""
        result = transformer._hash_sensitive_data("sensitive_data", {})
        assert len(result) == 64  # SHA256 hex length
        assert result != "sensitive_data"
        
        # Same input should produce same hash
        result2 = transformer._hash_sensitive_data("sensitive_data", {})
        assert result == result2
    
    def test_custom_function_registration(self, transformer):
        """Test custom function registration and usage."""
        def custom_reverse(value, params):
            return str(value)[::-1]
        
        transformer.register_custom_function("reverse", custom_reverse)
        
        rule = TransformationRule(
            type=TransformationType.CUSTOM,
            parameters={"function": "reverse"}
        )
        
        result = transformer._apply_transformation("hello", rule)
        assert result == "olleh"


class TestValidationRules:
    """Test data validation rules."""
    
    @pytest.fixture
    def transformer(self):
        """Fixture providing data transformer instance."""
        return DataTransformer()
    
    def test_required_validation(self, transformer):
        """Test required field validation."""
        rule = ValidationRule(type="required")
        
        result = transformer._validate_value("value", rule)
        assert result['valid'] is True
        
        result = transformer._validate_value(None, rule)
        assert result['valid'] is False
        
        result = transformer._validate_value("", rule)
        assert result['valid'] is False
    
    def test_pattern_validation(self, transformer):
        """Test pattern validation."""
        rule = ValidationRule(
            type="pattern",
            parameters={"regex": r"^\d{3}-\d{3}-\d{4}$"}
        )
        
        result = transformer._validate_value("123-456-7890", rule)
        assert result['valid'] is True
        
        result = transformer._validate_value("invalid-phone", rule)
        assert result['valid'] is False
    
    def test_range_validation(self, transformer):
        """Test numeric range validation."""
        rule = ValidationRule(
            type="range",
            parameters={"min": 0, "max": 100}
        )
        
        result = transformer._validate_value(50, rule)
        assert result['valid'] is True
        
        result = transformer._validate_value(-10, rule)
        assert result['valid'] is False
        
        result = transformer._validate_value(150, rule)
        assert result['valid'] is False
    
    def test_length_validation(self, transformer):
        """Test string length validation."""
        rule = ValidationRule(
            type="length",
            parameters={"min": 2, "max": 10}
        )
        
        result = transformer._validate_value("hello", rule)
        assert result['valid'] is True
        
        result = transformer._validate_value("a", rule)
        assert result['valid'] is False
        
        result = transformer._validate_value("very long text", rule)
        assert result['valid'] is False
    
    def test_in_validation(self, transformer):
        """Test 'in' list validation."""
        rule = ValidationRule(
            type="in",
            parameters={"values": ["red", "green", "blue"]}
        )
        
        result = transformer._validate_value("red", rule)
        assert result['valid'] is True
        
        result = transformer._validate_value("yellow", rule)
        assert result['valid'] is False


class TestErrorHandling:
    """Test error handling in transformations."""
    
    @pytest.fixture
    def transformer(self):
        """Fixture providing data transformer instance."""
        return DataTransformer()
    
    def test_transformation_error_handling(self, transformer):
        """Test handling of transformation errors."""
        mapping_config = MappingConfiguration(
            name="Error Test",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="invalid_number",
                    target_field="number",
                    transformations=[
                        TransformationRule(type=TransformationType.TO_INTEGER)
                    ]
                )
            ],
            error_handling="collect_errors"
        )
        
        source_data = {"invalid_number": "not_a_number"}
        
        result = transformer.transform_data(source_data, mapping_config)
        
        assert result.success is False
        assert len(result.transformation_errors) > 0
    
    def test_fail_fast_error_handling(self, transformer):
        """Test fail-fast error handling mode."""
        mapping_config = MappingConfiguration(
            name="Fail Fast Test",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="field1",
                    target_field="output1",
                    transformations=[
                        TransformationRule(type=TransformationType.TO_INTEGER)
                    ]
                ),
                FieldMapping(
                    source_field="field2",
                    target_field="output2"
                )
            ],
            error_handling="fail_fast"
        )
        
        source_data = {
            "field1": "invalid_number",
            "field2": "valid_value"
        }
        
        result = transformer.transform_data(source_data, mapping_config)
        
        assert result.success is False
        # Should stop processing after first error
        assert "output2" not in result.transformed_data
    
    def test_validation_mode_strict(self, transformer):
        """Test strict validation mode."""
        mapping_config = MappingConfiguration(
            name="Strict Validation",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="email",
                    target_field="email",
                    validation_rules=[
                        ValidationRule(
                            type="pattern",
                            parameters={"regex": r"^[^@]+@[^@]+\.[^@]+$"}
                        )
                    ]
                )
            ],
            validation_mode="strict"
        )
        
        source_data = {"email": "invalid_email"}
        
        result = transformer.transform_data(source_data, mapping_config)
        
        assert result.success is False
        assert len(result.transformation_errors) > 0


class TestSchemaValidator:
    """Test schema validation utilities."""
    
    def test_validate_json_schema_required_fields(self):
        """Test JSON schema validation for required fields."""
        schema = {
            "required": ["name", "age"]
        }
        
        # Valid data
        data = {"name": "John", "age": 25}
        errors = SchemaValidator.validate_json_schema(data, schema)
        assert len(errors) == 0
        
        # Missing required field
        data = {"name": "John"}
        errors = SchemaValidator.validate_json_schema(data, schema)
        assert len(errors) == 1
        assert "age" in errors[0]
    
    def test_validate_json_schema_types(self):
        """Test JSON schema type validation."""
        schema = {
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
                "active": {"type": "boolean"}
            }
        }
        
        # Valid data
        data = {"name": "John", "age": 25, "active": True}
        errors = SchemaValidator.validate_json_schema(data, schema)
        assert len(errors) == 0
        
        # Type mismatch
        data = {"name": 123, "age": "twenty", "active": "yes"}
        errors = SchemaValidator.validate_json_schema(data, schema)
        assert len(errors) == 3


class TestFormatConverter:
    """Test format conversion utilities."""
    
    def test_dict_to_xml(self):
        """Test dictionary to XML conversion."""
        data = {
            "name": "John",
            "age": 25,
            "address": {
                "street": "123 Main St",
                "city": "Anytown"
            }
        }
        
        xml_string = FormatConverter.dict_to_xml(data, "person")
        
        assert "<person>" in xml_string
        assert "<name>John</name>" in xml_string
        assert "<age>25</age>" in xml_string
        assert "<address>" in xml_string
        assert "<street>123 Main St</street>" in xml_string
    
    def test_dict_to_csv_rows(self):
        """Test dictionary list to CSV rows conversion."""
        data_list = [
            {"name": "John", "age": 25, "city": "Lagos"},
            {"name": "Jane", "age": 30, "city": "Abuja"},
            {"name": "Bob", "age": 35, "city": "Kano"}
        ]
        
        rows = FormatConverter.dict_to_csv_rows(data_list)
        
        # Should have header + 3 data rows
        assert len(rows) == 4
        
        # Check header
        headers = rows[0]
        assert "age" in headers
        assert "city" in headers
        assert "name" in headers
        
        # Check data rows
        assert "John" in rows[1]
        assert "25" in rows[1]
        assert "Lagos" in rows[1]
    
    def test_dict_to_csv_rows_empty_list(self):
        """Test CSV conversion with empty list."""
        rows = FormatConverter.dict_to_csv_rows([])
        assert len(rows) == 0


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    def test_transform_data_convenience_function(self):
        """Test convenience function for data transformation."""
        mapping_config = MappingConfiguration(
            name="Test",
            source_system="test",
            target_system="test",
            field_mappings=[
                FieldMapping(
                    source_field="input",
                    target_field="output",
                    transformations=[
                        TransformationRule(type=TransformationType.UPPERCASE)
                    ]
                )
            ]
        )
        
        source_data = {"input": "hello"}
        
        result = transform_data(source_data, mapping_config)
        
        assert result.success is True
        assert result.transformed_data["output"] == "HELLO"
    
    def test_register_custom_transformer(self):
        """Test registering custom transformation function."""
        def custom_transformer(value, params):
            return f"custom_{value}"
        
        register_custom_transformer("custom", custom_transformer)
        
        # Verify function was registered globally
        from app.utils.transformers import data_transformer
        assert "custom" in data_transformer.custom_functions


if __name__ == '__main__':
    pytest.main([__file__])