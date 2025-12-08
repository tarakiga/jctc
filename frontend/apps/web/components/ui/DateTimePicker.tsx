'use client'

import { DatesProvider, DateTimePicker as MantineDateTimePicker } from '@mantine/dates'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'

// Custom Mantine theme to match the app's design
const mantineTheme = createTheme({
    primaryColor: 'dark',
    fontFamily: 'inherit',
    radius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
    },
    defaultRadius: 'md',
})

interface DateTimePickerProps {
    value: string // ISO datetime-local format: "2025-12-06T12:00"
    onChange: (value: string) => void
    label?: string
    required?: boolean
    placeholder?: string
    error?: string
    className?: string
    maxDate?: Date // Maximum selectable date
    minDate?: Date // Minimum selectable date
}

export function DateTimePicker({
    value,
    onChange,
    label,
    required = false,
    placeholder = 'Select date and time',
    error,
    className = '',
    maxDate,
    minDate,
}: DateTimePickerProps) {
    // Convert datetime-local string to Date object
    const dateValue = value ? new Date(value) : null

    // Handle change - Mantine can pass Date, string, or null depending on the interaction
    const handleChange = (dateInput: Date | string | null) => {
        if (!dateInput) {
            onChange('')
            return
        }

        // Convert to Date if it's a string
        let date: Date
        if (typeof dateInput === 'string') {
            date = new Date(dateInput)
        } else if (dateInput instanceof Date) {
            date = dateInput
        } else {
            onChange('')
            return
        }

        // Check if it's a valid date
        if (isNaN(date.getTime())) {
            onChange('')
            return
        }

        // Convert Date to datetime-local format string
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        onChange(`${year}-${month}-${day}T${hours}:${minutes}`)
    }

    return (
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            <DatesProvider settings={{ locale: 'en', firstDayOfWeek: 0 }}>
                <div className={className}>
                    {label && (
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            {label} {required && <span className="text-red-500">*</span>}
                        </label>
                    )}
                    <MantineDateTimePicker
                        value={dateValue}
                        onChange={handleChange as any}
                        placeholder={placeholder}
                        clearable
                        valueFormat="MMM DD, YYYY - hh:mm A"
                        dropdownType="modal"
                        maxDate={maxDate}
                        minDate={minDate}
                        timePickerProps={{
                            withDropdown: true,
                            format: '12h',
                        }}
                        classNames={{
                            input: `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all ${error ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white hover:border-slate-400'}`,
                        }}
                        styles={{
                            input: {
                                height: 'auto',
                                minHeight: '48px',
                            },
                        }}
                    />
                    {error && (
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                    )}
                </div>
            </DatesProvider>
        </MantineProvider>
    )
}

export default DateTimePicker
