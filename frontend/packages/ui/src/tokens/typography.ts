/**
 * JCTC Design System - Typography Tokens
 * Professional typeface system for law enforcement application
 */

export const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
    display: ['Archivo', 'Inter', 'sans-serif'],
  },

  // Type Scale (8px base, 1.25 ratio)
  fontSize: {
    xs: '0.75rem', // 12px - Captions, metadata
    sm: '0.875rem', // 14px - Body small, labels
    base: '1rem', // 16px - Body text
    lg: '1.125rem', // 18px - Large body, subheadings
    xl: '1.25rem', // 20px - H4
    '2xl': '1.5rem', // 24px - H3
    '3xl': '1.875rem', // 30px - H2
    '4xl': '2.25rem', // 36px - H1
    '5xl': '3rem', // 48px - Display text
  },

  // Line Heights
  lineHeight: {
    none: 1,
    tight: 1.25, // Headers
    snug: 1.375,
    normal: 1.5, // Body text
    relaxed: 1.625,
    loose: 1.75, // Long-form content
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

export type TypographyToken = keyof typeof typography

// Preset text styles for common use cases
export const textStyles = {
  h1: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    fontFamily: typography.fontFamily.display,
  },
  h2: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    fontFamily: typography.fontFamily.display,
  },
  h3: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    fontFamily: typography.fontFamily.display,
  },
  h4: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
  },
  code: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.mono,
    lineHeight: typography.lineHeight.normal,
  },
} as const
