/**
 * Phone number validation and formatting utilities
 * Using libphonenumber-js for international phone number support
 */

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js'

export interface PhoneValidationResult {
    isValid: boolean
    formatted?: string
    country?: string
    type?: string
    error?: string
}

/**
 * Validate and format a phone number
 * 
 * @param phoneNumber - Phone number string
 * @param defaultCountry - Default country code (e.g., 'NG' for Nigeria)
 * @returns Validation result with formatted number
 */
export function validatePhoneNumber(
    phoneNumber: string,
    defaultCountry: CountryCode = 'NG'
): PhoneValidationResult {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
        return {
            isValid: false,
            error: 'Phone number is required'
        }
    }

    try {
        // Check if valid
        const isValid = isValidPhoneNumber(phoneNumber, defaultCountry)

        if (!isValid) {
            return {
                isValid: false,
                error: 'Invalid phone number format'
            }
        }

        // Parse and format
        const parsed = parsePhoneNumber(phoneNumber, defaultCountry)

        return {
            isValid: true,
            formatted: parsed.formatInternational(),
            country: parsed.country,
            type: parsed.getType() || undefined
        }
    } catch (error) {
        return {
            isValid: false,
            error: 'Unable to parse phone number'
        }
    }
}

/**
 * Format a phone number for display
 * 
 * @param phoneNumber - Phone number string
 * @param format - Format type ('international' | 'national' | 'e164')
 * @param defaultCountry - Default country code
 * @returns Formatted phone number
 */
export function formatPhoneNumber(
    phoneNumber: string,
    format: 'international' | 'national' | 'e164' = 'international',
    defaultCountry: CountryCode = 'NG'
): string {
    try {
        const parsed = parsePhoneNumber(phoneNumber, defaultCountry)

        switch (format) {
            case 'international':
                return parsed.formatInternational()
            case 'national':
                return parsed.formatNational()
            case 'e164':
                return parsed.format('E.164')
            default:
                return parsed.formatInternational()
        }
    } catch (error) {
        return phoneNumber
    }
}

/**
 * Get phone number metadata
 */
export function getPhoneMetadata(phoneNumber: string, defaultCountry: CountryCode = 'NG') {
    try {
        const parsed = parsePhoneNumber(phoneNumber, defaultCountry)

        return {
            country: parsed.country,
            countryCallingCode: parsed.countryCallingCode,
            nationalNumber: parsed.nationalNumber,
            type: parsed.getType(),
            isPossible: parsed.isPossible(),
            isValid: parsed.isValid()
        }
    } catch (error) {
        return null
    }
}

/**
 * Common country codes for JCTC use cases
 */
export const COMMON_COUNTRIES: Array<{ code: CountryCode; name: string; flag: string }> = [
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
]
