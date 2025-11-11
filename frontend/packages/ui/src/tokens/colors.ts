/**
 * JCTC Design System - Color Tokens
 * Law enforcement color palette with semantic meaning
 */

export const colors = {
  // Primary - Authority & Trust (Nigeria Blue)
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#1976D2', // Main brand
    600: '#1565C0',
    700: '#1565C0',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Severity Indicators (Case Priority)
  severity: {
    critical: '#D32F2F', // Level 5 - Red
    high: '#F57C00', // Level 4 - Orange
    medium: '#FBC02D', // Level 3 - Yellow
    low: '#388E3C', // Level 2 - Green
    minimal: '#0288D1', // Level 1 - Blue
  },

  // Status Colors (Case Status)
  status: {
    open: '#2196F3', // Case Open
    active: '#4CAF50', // Investigation Active
    pending: '#FF9800', // Awaiting Action
    closed: '#9E9E9E', // Case Closed
    archived: '#607D8B', // Archived
  },

  // Role-Based Colors (7 User Roles)
  roles: {
    admin: '#6A1B9A', // ADMIN - Purple
    supervisor: '#C62828', // SUPERVISOR - Red
    prosecutor: '#AD1457', // PROSECUTOR - Pink
    investigator: '#1565C0', // INVESTIGATOR - Blue
    forensic: '#00838F', // FORENSIC - Cyan
    liaison: '#2E7D32', // LIAISON - Green
    intake: '#F57F17', // INTAKE - Amber
  },

  // Neutral System (Grayscale)
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Semantic Colors
  success: '#2E7D32',
  warning: '#F57C00',
  error: '#C62828',
  info: '#0288D1',

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#FAFAFA',
    dark: '#212121',
  },

  // Border Colors
  border: {
    light: '#E0E0E0',
    default: '#BDBDBD',
    dark: '#757575',
  },

  // Text Colors
  text: {
    primary: '#212121',
    secondary: '#616161',
    tertiary: '#9E9E9E',
    inverse: '#FFFFFF',
  },
} as const

export type ColorToken = keyof typeof colors
