'use client'

import { useState } from 'react'
import {
  FileText,
  ListChecks,
  Activity,
  Package,
  Scale,
  Globe,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

type Section =
  | 'overview'
  | 'evidence'
  | 'parties'
  | 'assignments'
  | 'tasks'
  | 'actions'
  | 'seizures'
  | 'devices'
  | 'forensics'
  | 'legal'
  | 'prosecution'
  | 'international'
  | 'attachments'
  | 'collaboration'
  | 'timeline'

interface NavGroup {
  id: string
  label: string
  icon: any
  sections: {
    id: Section
    label: string
  }[]
}

interface CaseDetailSidebarProps {
  activeSection: Section
  onSectionChange: (section: Section) => void
  stats?: {
    evidenceCount: number
    taskCount: number
    teamCount: number
  }
  className?: string
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: FileText,
    sections: [{ id: 'overview', label: 'Case Overview' }]
  },
  {
    id: 'investigation',
    label: 'Investigation',
    icon: Activity,
    sections: [
      { id: 'parties', label: 'Parties' },
      { id: 'timeline', label: 'Timeline' }
    ]
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: Package,
    sections: [
      { id: 'seizures', label: 'Seizures' },
      { id: 'evidence', label: 'Evidence Inventory' },
      { id: 'forensics', label: 'Forensics' }
    ]
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: ListChecks,
    sections: [
      { id: 'tasks', label: 'Tasks' },
      { id: 'actions', label: 'Actions' },
      { id: 'assignments', label: 'Assignments' }
    ]
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: Scale,
    sections: [
      { id: 'legal', label: 'Legal Instruments' },
      { id: 'prosecution', label: 'Prosecution' }
    ]
  },
  {
    id: 'external',
    label: 'External',
    icon: Globe,
    sections: [
      { id: 'international', label: 'International' },
      { id: 'collaboration', label: 'Collaboration' },
      { id: 'attachments', label: 'Attachments' }
    ]
  }
]

export function CaseDetailSidebar({ activeSection, onSectionChange, stats, className = '' }: CaseDetailSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(NAV_GROUPS.map(g => g.id))
  )

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  return (
    <nav className={`w-72 bg-white border-r border-slate-200 self-start sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto ${className}`}>
      <div className="p-6 space-y-1">
        {NAV_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.id)
          const hasActiveSection = group.sections.some(s => s.id === activeSection)
          const Icon = group.icon

          // Single-section groups (like Overview) don't need expansion
          const isSingleSection = group.sections.length === 1

          return (
            <div key={group.id} className="space-y-1">
              {isSingleSection ? (
                // Single section - render as direct button
                <button
                  onClick={() => onSectionChange(group.sections[0].id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    text-sm font-medium transition-all duration-200
                    ${activeSection === group.sections[0].id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                </button>
              ) : (
                <>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl
                      text-sm font-semibold transition-all duration-200
                      ${hasActiveSection
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="ml-7 space-y-0.5 border-l-2 border-slate-100 pl-4 py-1">
                      {group.sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => onSectionChange(section.id)}
                          className={`
                            w-full flex items-center gap-2 px-3 py-2.5 rounded-lg
                            text-sm font-medium transition-all duration-200
                            ${activeSection === section.id
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }
                          `}
                        >
                          <div className={`
                            w-1.5 h-1.5 rounded-full
                            ${activeSection === section.id ? 'bg-white' : 'bg-slate-300'}
                          `} />
                          <span>{section.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Stats Footer */}
      <div className="sticky bottom-0 mt-auto p-6 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30 backdrop-blur-sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between group hover:bg-white/50 rounded-lg p-2 transition-colors">
            <span className="text-xs font-medium text-slate-600">Evidence Items</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{stats?.evidenceCount || 0}</span>
          </div>
          <div className="flex items-center justify-between group hover:bg-white/50 rounded-lg p-2 transition-colors">
            <span className="text-xs font-medium text-slate-600">Open Tasks</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{stats?.taskCount || 0}</span>
          </div>
          <div className="flex items-center justify-between group hover:bg-white/50 rounded-lg p-2 transition-colors">
            <span className="text-xs font-medium text-slate-600">Team Members</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{stats?.teamCount || 0}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
