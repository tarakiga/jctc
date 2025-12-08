'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Users, Briefcase, Plane, GraduationCap, Coffee } from 'lucide-react'
import { Button } from '@jctc/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@jctc/ui'
import { Badge } from '@jctc/ui'
import { TeamActivity, TeamActivityType, TeamActivityWithUser } from '@jctc/types'
import { useTeamActivities, useUserTeamActivities, useCreateTeamActivity, useUpdateTeamActivity, useDeleteTeamActivity } from '@/lib/hooks/useTeamActivity'
import { TeamActivityModal } from './team-activity/TeamActivityModal'
import { DeleteTeamActivityModal } from './team-activity/DeleteTeamActivityModal'
import { useAuth } from '@/lib/contexts/AuthContext'

interface TeamActivityCalendarProps {
  className?: string
}

const activityIcons = {
  [TeamActivityType.MEETING]: Calendar,
  [TeamActivityType.TRAVEL]: Plane,
  [TeamActivityType.TRAINING]: GraduationCap,
  [TeamActivityType.LEAVE]: Coffee,
}

const activityColors = {
  [TeamActivityType.MEETING]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TeamActivityType.TRAVEL]: 'bg-purple-100 text-purple-800 border-purple-200',
  [TeamActivityType.TRAINING]: 'bg-green-100 text-green-800 border-green-200',
  [TeamActivityType.LEAVE]: 'bg-orange-100 text-orange-800 border-orange-200',
}

export function TeamActivityCalendar({ className }: TeamActivityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<TeamActivity | null>(null)
  const [deletingActivity, setDeletingActivity] = useState<TeamActivity | null>(null)
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly') // Default to weekly view
  
  const { user } = useAuth()
  
  // Calculate date range based on view mode
  const getDateRange = () => {
    if (viewMode === 'weekly') {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) // Sunday
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
      return {
        start_date: format(startOfWeek, 'yyyy-MM-dd'),
        end_date: format(endOfWeek, 'yyyy-MM-dd')
      }
    } else {
      return {
        start_date: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(currentDate), 'yyyy-MM-dd')
      }
    }
  }

  // Use actual API data with date range filtering
  const { activities, loading: isLoading, error, refetch } = useTeamActivities(getDateRange())
    
  // Refetch activities when date range changes
  useEffect(() => {
    refetch()
  }, [currentDate, viewMode])
  const createMutation = useCreateTeamActivity()
  const updateMutation = useUpdateTeamActivity()
  const deleteMutation = useDeleteTeamActivity()

  // Calculate calendar days based on view mode
  const getCalendarDays = () => {
    if (viewMode === 'weekly') {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) // Sunday
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
      return eachDayOfInterval({ start: startOfWeek, end: endOfWeek })
    } else {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      return eachDayOfInterval({ start: monthStart, end: monthEnd })
    }
  }
  
  const calendarDays = getCalendarDays()

  const getActivitiesForDate = (date: Date) => {
    return activities?.filter((activity) => 
      isSameDay(new Date(activity.start_time), date)
    ) || []
  }

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (viewMode === 'weekly') {
      setCurrentDate(direction === 'prev' 
        ? new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000) // Subtract 7 days
        : new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000) // Add 7 days
      )
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleCreateActivity = () => {
    setEditingActivity(null)
    setIsModalOpen(true)
  }

  const handleEditActivity = (activity: TeamActivity) => {
    setEditingActivity(activity)
    setIsModalOpen(true)
  }

  const handleDeleteActivity = (activity: TeamActivity) => {
    setDeletingActivity(activity)
    setIsDeleteModalOpen(true)
  }

  const handleModalSubmit = async (data: {
    activity_type: TeamActivityType
    title: string
    description?: string
    start_time: string
    end_time: string
  }) => {
    try {
      if (editingActivity) {
        await updateMutation.updateActivity(editingActivity.id, data)
      } else {
        await createMutation.createActivity(data)
      }
      setIsModalOpen(false)
      setEditingActivity(null)
      refetch()
    } catch (error) {
      console.error('Error saving team activity:', error)
    }
  }

  const isCreating = createMutation.loading
  const isUpdating = updateMutation.loading
  const isDeleting = deleteMutation.loading

  const handleDeleteConfirm = async () => {
    if (deletingActivity) {
      try {
        await deleteMutation.deleteActivity(deletingActivity.id)
        setIsDeleteModalOpen(false)
        setDeletingActivity(null)
        refetch()
      } catch (error) {
        console.error('Error deleting team activity:', error)
      }
    }
  }

  // Check for admin or supervisor roles for calendar management
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Team Activity Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-500">Loading activities...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Team Activity Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Failed to load team activities: {(error as Error)?.message || 'Unknown error'}</div>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Team Activity Calendar</CardTitle>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'weekly' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('weekly')}
                className="px-3 py-1 text-black"
              >
                Weekly
              </Button>
              <Button
                variant={viewMode === 'monthly' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('monthly')}
                className="px-3 py-1 text-black"
              >
                Monthly
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            {isAdmin && (
                <Button variant="primary" size="sm" onClick={handleCreateActivity} disabled={isCreating}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Activity
                </Button>
              )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Modals */}
        <TeamActivityModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingActivity(null)
          }}
          onSubmit={handleModalSubmit}
          initialData={editingActivity ?? undefined}
          mode={editingActivity ? 'edit' : 'create'}
          isLoading={isCreating || isUpdating}
        />

        <DeleteTeamActivityModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setDeletingActivity(null)
          }}
          onConfirm={handleDeleteConfirm}
          activityTitle={deletingActivity?.title || ''}
          isLoading={isDeleting}
        />

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigatePeriod('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          <h3 className="text-lg font-semibold text-slate-900 text-center flex-1 mx-2">
            {viewMode === 'weekly' 
              ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')
            }
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigatePeriod('next')}
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2 hidden md:block">
                {day}
              </div>
            ))}
            {/* Mobile day abbreviations */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={`${day}-${index}`} className="text-center text-xs font-medium text-gray-500 py-2 md:hidden">
                {day}
              </div>
            ))}
          </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayActivities = getActivitiesForDate(day)
            const isToday = isSameDay(day, new Date())
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            
            return (
              <div
                key={day.toString()}
                className={`
                  min-h-[60px] md:min-h-[80px] p-1 md:p-2 border rounded-lg cursor-pointer transition-all
                  ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200'}
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  hover:bg-slate-50
                `}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-sm font-medium text-slate-700 mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayActivities.slice(0, 1).map((activity) => {
                    const Icon = activityIcons[activity.activity_type]
                    return (
                      <div
                        key={activity.id}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs border ${activityColors[activity.activity_type]}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="truncate">{activity.title}</span>
                      </div>
                    )
                  })}
                  {dayActivities.length > 1 && (
                    <div className="text-xs text-slate-500 text-center">
                      +{dayActivities.length - 1} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Date Activities */}
        {selectedDate && (
          <div className="mt-6 p-3 md:p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3 text-sm md:text-base">
              Activities for {format(selectedDate, 'MMMM d, yyyy')}
            </h4>
            {getActivitiesForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-sm md:text-base">No activities scheduled for this date.</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {getActivitiesForDate(selectedDate).map(activity => {
                  const Icon = activityIcons[activity.activity_type]
                  
                  return (
                    <div key={activity.id} className="bg-white p-2 md:p-3 rounded border">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                            <span className={`px-2 py-1 text-xs rounded ${activityColors[activity.activity_type]}`}>
                              {activity.activity_type}
                            </span>
                            <span className="text-xs md:text-sm text-gray-500">
                              {format(new Date(activity.start_time), 'h:mm a')} - {format(new Date(activity.end_time), 'h:mm a')}
                            </span>
                          </div>
                          <h5 className="font-medium text-sm md:text-base">{activity.title}</h5>
                          {activity.description && (
                            <p className="text-xs md:text-sm text-gray-600 mt-1">{activity.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Assigned to: {activity.user?.full_name || 'Unknown'}
                          </p>
                        </div>
                        {isAdmin && (
                          <div className="flex flex-wrap items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditActivity(activity)} disabled={isUpdating}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteActivity(activity)} disabled={isDeleting}>
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}