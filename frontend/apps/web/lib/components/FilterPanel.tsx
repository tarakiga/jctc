import { Button, Badge, Card, CardContent } from '@jctc/ui'
import { SearchBar } from './SearchBar'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  id: string
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface FilterPanelProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters: FilterConfig[]
  onClearAll?: () => void
  className?: string
}

export function FilterPanel({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  onClearAll,
  className = '',
}: FilterPanelProps) {
  const hasActiveFilters = filters.some((f) => f.value !== 'ALL') || (searchValue && searchValue.length > 0)

  return (
    <Card variant="elevated" className={className}>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          {onSearchChange && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Search</label>
              <SearchBar
                value={searchValue || ''}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            </div>
          )}

          {/* Filters */}
          {filters.map((filter) => (
            <div key={filter.id}>
              <label className="block text-sm font-medium text-neutral-700 mb-2">{filter.label}</label>
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-neutral-600">Active filters:</span>
            {filters.map((filter) =>
              filter.value !== 'ALL' ? (
                <Badge
                  key={filter.id}
                  variant="info"
                  className="cursor-pointer"
                  onClick={() => filter.onChange('ALL')}
                >
                  {filter.label}: {filter.options.find((o) => o.value === filter.value)?.label} ✕
                </Badge>
              ) : null
            )}
            {searchValue && (
              <Badge
                variant="default"
                className="cursor-pointer"
                onClick={() => onSearchChange?.('')}
              >
                Search: "{searchValue}" ✕
              </Badge>
            )}
            {onClearAll && (
              <Button variant="ghost" size="sm" onClick={onClearAll}>
                Clear all
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
