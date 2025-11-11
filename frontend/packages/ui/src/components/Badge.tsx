import * as React from 'react'
import { cn } from '../utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'critical'
    | 'high'
    | 'medium'
    | 'low'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', icon, children, ...props }, ref) => {
    const variants = {
      default: 'bg-neutral-100 text-neutral-800 border-neutral-300',
      success: 'bg-green-100 text-green-800 border-green-300',
      warning: 'bg-amber-100 text-amber-800 border-amber-300',
      error: 'bg-red-100 text-red-800 border-red-300',
      info: 'bg-blue-100 text-blue-800 border-blue-300',
      // Severity variants
      critical: 'bg-red-600 text-white border-red-700',
      high: 'bg-orange-500 text-white border-orange-600',
      medium: 'bg-yellow-500 text-neutral-900 border-yellow-600',
      low: 'bg-green-500 text-white border-green-600',
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border font-medium',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'
