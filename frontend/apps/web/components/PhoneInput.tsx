'use client'

import { useState, useEffect } from 'react'
import { CountryCode } from 'libphonenumber-js'
import { validatePhoneNumber, formatPhoneNumber, COMMON_COUNTRIES } from '@/lib/utils/phoneValidation'

interface PhoneInputProps {
    value: string
    onChange: (value: string) => void
    onValidationChange?: (isValid: boolean) => void
    defaultCountry?: CountryCode
    label?: string
    placeholder?: string
    required?: boolean
    error?: string
    disabled?: boolean
    className?: string
}

export function PhoneInput({
    value,
    onChange,
    onValidationChange,
    defaultCountry = 'NG',
    label,
    placeholder = '+234 XXX XXX XXXX',
    required = false,
    error: externalError,
    disabled = false,
    className = ''
}: PhoneInputProps) {
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry)
    const [internalError, setInternalError] = useState<string>('')
    const [isTouched, setIsTouched] = useState(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    const error = externalError || internalError

    useEffect(() => {
        if (value && isTouched) {
            const validation = validatePhoneNumber(value, selectedCountry)
            setInternalError(validation.isValid ? '' : validation.error || 'Invalid phone number')

            if (onValidationChange) {
                onValidationChange(validation.isValid)
            }
        }
    }, [value, selectedCountry, isTouched, onValidationChange])

    const handleBlur = () => {
        setIsTouched(true)

        // Format on blur if valid
        if (value) {
            const validation = validatePhoneNumber(value, selectedCountry)
            if (validation.isValid && validation.formatted) {
                onChange(validation.formatted)
            }
        }
    }

    const selectedCountryData = COMMON_COUNTRIES.find(c => c.code === selectedCountry) || COMMON_COUNTRIES[0]

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-semibold text-slate-900">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                <div className="flex gap-2">
                    {/* Country Selector */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={disabled}
                            className="flex items-center gap-2 px-3 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                            aria-label="Select country"
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="listbox"
                        >
                            <span className="text-xl">{selectedCountryData.flag}</span>
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {isDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div
                                    className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto"
                                    role="listbox"
                                >
                                    {COMMON_COUNTRIES.map((country) => (
                                        <button
                                            key={country.code}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCountry(country.code)
                                                setIsDropdownOpen(false)
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 transition-colors text-left ${selectedCountry === country.code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-900'
                                                }`}
                                            role="option"
                                            aria-selected={selectedCountry === country.code}
                                        >
                                            <span className="text-xl">{country.flag}</span>
                                            <span className="flex-1 font-medium">{country.name}</span>
                                            <span className="text-sm text-slate-500">{country.code}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Phone Number Input */}
                    <input
                        type="tel"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        required={required}
                        className={`flex-1 px-4 py-3 border rounded-xl transition-all text-slate-900 ${error && isTouched
                                ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                                : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                            } disabled:bg-slate-50 disabled:cursor-not-allowed`}
                        aria-invalid={!!(error && isTouched)}
                        aria-describedby={error && isTouched ? `${label}-error` : undefined}
                    />
                </div>

                {/* Error Message */}
                {error && isTouched && (
                    <div
                        id={`${label}-error`}
                        className="mt-2 flex items-center gap-2 text-sm text-red-600"
                        role="alert"
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
