import { useState } from 'react'
import { useTeamActivities, useCreateTeamActivity, useUpdateTeamActivity, useDeleteTeamActivity } from '@/lib/hooks/useTeamActivity'
import { useLookup, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { useUsers } from '@/lib/hooks/useUsers'
import { useAuth } from '@/lib/contexts/AuthContext'
import { TeamActivity, TeamActivityWithUser } from '@jctc/types'
import { Calendar as CalendarIcon, Plane, GraduationCap, Coffee, Plus, Edit2, Trash2, X, Check, Clock, User, ChevronLeft, CalendarDays, Briefcase, Users, FileText, Phone, Video, MapPin, Star, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button, Badge } from '@jctc/ui'
import { format, isToday, isTomorrow, isSameDay, parseISO } from 'date-fns'
import DateTimePicker from '@/components/ui/DateTimePicker'

// --- Types & Interfaces ---

interface CalendarManagementDrawerProps {
    isOpen: boolean
    onClose: () => void
}

// Extensive icon map to support dynamic lookups
const activityIcons: Record<string, any> = {
    calendar: CalendarIcon,
    plane: Plane,
    'graduation-cap': GraduationCap,
    coffee: Coffee,
    briefcase: Briefcase,
    work: Briefcase,
    users: Users,
    meeting: Users,
    file: FileText,
    document: FileText,
    phone: Phone,
    call: Phone,
    video: Video,
    location: MapPin,
    travel: Plane,
    star: Star,
    important: AlertCircle,
}

const DefaultIcon = CalendarIcon

// --- Helper Components ---

const ActivityTypeCard = ({
    type,
    isSelected,
    onClick
}: {
    type: any,
    isSelected: boolean,
    onClick: () => void
}) => {
    const Icon = activityIcons[type.icon] || DefaultIcon

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-200 w-full aspect-square group
                ${isSelected
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-indigo-100 hover:bg-slate-50 hover:shadow-md'
                }
            `}
        >
            <div
                className={`p-4 rounded-full mb-4 transition-colors duration-200 ${isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }`}
            >
                <Icon className="w-8 h-8" />
            </div>
            <span className={`text-sm font-bold text-center ${isSelected ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                {type.label}
            </span>
            {isSelected && (
                <div className="absolute top-3 right-3 text-slate-900 bg-white rounded-full p-0.5 shadow-sm">
                    <Check className="w-4 h-4" />
                </div>
            )}
        </button>
    )
}

// --- Main Component ---

export function CalendarManagementDrawer({ isOpen, onClose }: CalendarManagementDrawerProps) {
    // --- State & Hooks ---
    const { activities, isLoading, refetch } = useTeamActivities()
    const { values: activityTypes, loading: typesLoading } = useLookup(LOOKUP_CATEGORIES.ACTIVITY_TYPE)
    const { users } = useUsers()
    const { user: currentUser } = useAuth()

    const createMutation = useCreateTeamActivity()
    const updateMutation = useUpdateTeamActivity()
    const deleteMutation = useDeleteTeamActivity()

    const [view, setView] = useState<'list' | 'form'>('list')
    const [formStep, setFormStep] = useState<1 | 2 | 3>(1) // 1: Type, 2: Details, 3: Attendees
    const [editingActivity, setEditingActivity] = useState<TeamActivityWithUser | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Form State
    const initialFormData = {
        activity_type: '',
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        attendee_ids: [] as string[],
    }
    const [formData, setFormData] = useState(initialFormData)
    const [isSaving, setIsSaving] = useState(false)

    // --- Helpers ---

    const handleOpenForm = (activity?: TeamActivityWithUser) => {
        if (activity) {
            setEditingActivity(activity)
            setFormData({
                activity_type: activity.activity_type,
                title: activity.title,
                description: activity.description || '',
                start_time: activity.start_time,
                end_time: activity.end_time,
                attendee_ids: activity.attendees?.map((a: any) => a.id) || [],
            })
            setFormStep(2) // Start at details for edit
        } else {
            setEditingActivity(null)
            setFormData({
                ...initialFormData,
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                attendee_ids: [],
            })
            setFormStep(1)
        }
        setView('form')
    }

    const handleCloseForm = () => {
        setView('list')
        setEditingActivity(null)
        setFormData(initialFormData)
        setFormStep(1)
    }

    const handleTypeSelect = (typeValue: string) => {
        setFormData({ ...formData, activity_type: typeValue })
        setFormStep(2) // Auto-advance
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.activity_type || !formData.title || !formData.start_time || !formData.end_time) {
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                activity_type: formData.activity_type as any,
                title: formData.title,
                description: formData.description || undefined,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString(),
                user_id: currentUser?.id,
                attendee_ids: formData.attendee_ids,
            }

            if (editingActivity) {
                await updateMutation.updateActivity(editingActivity.id, payload)
            } else {
                await createMutation.createActivity(payload)
            }
            refetch()
            handleCloseForm()
        } catch (error) {
            console.error('Failed to save activity:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteMutation.deleteActivity(id)
            setDeleteConfirmId(null)
            refetch()
        } catch (error) {
            console.error('Failed to delete activity:', error)
        }
    }

    const getActivityColor = (typeKey: string) => {
        const typeTag = activityTypes.find(t => t.value === typeKey)
        return typeTag?.color || '#94a3b8'
    }

    // --- Render: List View (Agenda) ---

    // Group activities by date
    const sortedActivities = [...(activities || [])].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    const groupedActivities = sortedActivities.reduce((groups, activity) => {
        const date = new Date(activity.start_time)
        const dateKey = format(date, 'yyyy-MM-dd')
        if (!groups[dateKey]) groups[dateKey] = []
        groups[dateKey].push(activity)
        return groups
    }, {} as Record<string, TeamActivityWithUser[]>)

    const filteredDates = Object.keys(groupedActivities).sort()

    const renderAgendaView = () => (
        <div className="h-full flex flex-col">
            <div className="p-6 pb-2">
                <Button
                    variant="primary"
                    onClick={() => handleOpenForm()}
                    className="w-full justify-center bg-slate-900 hover:bg-slate-800 text-white h-12 text-md shadow-lg shadow-slate-900/10"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Agenda Item
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <div className="animate-spin mb-4"><Clock className="w-8 h-8" /></div>
                        <p>Loading agenda...</p>
                    </div>
                ) : filteredDates.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarDays className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No Upcoming Activities</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-2">
                            Your team calendar is clear. Click 'New Agenda Item' to schedule something.
                        </p>
                    </div>
                ) : (
                    filteredDates.map(dateKey => {
                        const date = parseISO(dateKey)
                        const dayActivities = groupedActivities[dateKey]

                        let dateLabel = format(date, 'EEEE, MMM d')
                        if (isToday(date)) dateLabel = 'Today'
                        if (isTomorrow(date)) dateLabel = 'Tomorrow'

                        return (
                            <div key={dateKey} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-3 z-10 border-b border-slate-100 flex items-baseline gap-3 mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{dateLabel}</h3>
                                    {!isToday(date) && !isTomorrow(date) && (
                                        <span className="text-sm text-slate-400 font-medium">{format(date, 'yyyy')}</span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {dayActivities.map(activity => {
                                        const color = getActivityColor(activity.activity_type)
                                        const startTime = format(new Date(activity.start_time), 'HH:mm')
                                        const endTime = format(new Date(activity.end_time), 'HH:mm')

                                        return (
                                            <div
                                                key={activity.id}
                                                className="group relative bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex gap-4 overflow-hidden"
                                            >
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-1"
                                                    style={{ backgroundColor: color }}
                                                />

                                                <div className="flex flex-col items-center justify-start pt-0.5 w-16 flex-shrink-0">
                                                    <span className="text-sm font-bold text-slate-900">{startTime}</span>
                                                    <span className="text-xs text-slate-400">{endTime}</span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0 h-5 border-slate-200 text-slate-500 uppercase tracking-wide font-semibold"
                                                        >
                                                            {activityTypes.find(t => t.value === activity.activity_type)?.label || activity.activity_type}
                                                        </Badge>
                                                    </div>
                                                    <h4 className="text-base font-semibold text-slate-900 truncate pr-8">
                                                        {activity.title}
                                                    </h4>
                                                    {activity.description && (
                                                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                            {activity.description}
                                                        </p>
                                                    )}

                                                    {/* Attendees section */}
                                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1">Attending:</span>
                                                        {activity.attendees && activity.attendees.length > 0 ? (
                                                            <>
                                                                <div className="flex -space-x-2">
                                                                    {activity.attendees.slice(0, 3).map((attendee: any, idx: number) => (
                                                                        <div
                                                                            key={attendee.id || idx}
                                                                            className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-700"
                                                                            title={attendee.full_name || attendee.email}
                                                                        >
                                                                            {attendee.full_name?.[0] || attendee.email?.[0] || 'U'}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {activity.attendees.length > 3 && (
                                                                    <span className="text-xs text-slate-500 font-medium">
                                                                        +{activity.attendees.length - 3} more
                                                                    </span>
                                                                )}
                                                                {activity.attendees.length <= 3 && (
                                                                    <span className="text-xs text-slate-500 font-medium truncate">
                                                                        {activity.attendees.map((a: any) => a.full_name || a.email).join(', ')}
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">No attendees</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenForm(activity)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(activity.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )

    // --- Render: Form View ---

    const renderFormView = () => (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Form Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
                {formStep === 1 ? (
                    <button
                        onClick={handleCloseForm}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                ) : (
                    <button
                        onClick={() => setFormStep((formStep - 1) as 1 | 2 | 3)}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                        title="Go back"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                )}

                <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                        {editingActivity ? 'Edit Activity' : 'New Activity'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                        Step {formStep} of 3: {formStep === 1 ? 'Select Type' : formStep === 2 ? 'Enter Details' : 'Select Attendees'}
                    </p>
                </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto h-full flex flex-col">

                    {/* STEP 1: Activity Type Selection */}
                    {formStep === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">What kind of activity?</h3>

                            <div className="grid grid-cols-2 gap-4">
                                {typesLoading ? (
                                    <div className="col-span-2 text-center py-8 text-slate-400">Loading types...</div>
                                ) : (
                                    activityTypes.map(type => (
                                        <ActivityTypeCard
                                            key={type.value}
                                            type={type}
                                            isSelected={formData.activity_type === type.value}
                                            onClick={() => handleTypeSelect(type.value)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Details */}
                    {formStep === 2 && (
                        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 flex-1">

                                {/* Selected Type Indicator */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                                        style={{ backgroundColor: getActivityColor(formData.activity_type) }}
                                    >
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Activity Type</span>
                                        <p className="font-semibold text-slate-900">
                                            {activityTypes.find(t => t.value === formData.activity_type)?.label || formData.activity_type}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setFormStep(1)}>Change</Button>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                                        placeholder="e.g., Weekly Team Sync"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <DateTimePicker
                                        label="Start Time"
                                        required
                                        value={formData.start_time}
                                        onChange={(val) => setFormData({ ...formData, start_time: val })}
                                    />
                                    <DateTimePicker
                                        label="End Time"
                                        required
                                        value={formData.end_time}
                                        onChange={(val) => setFormData({ ...formData, end_time: val })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description (Optional)</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none text-slate-900 placeholder:text-slate-400 resize-none"
                                        placeholder="Add agenda items, location, or notes..."
                                    />
                                </div>
                            </div>

                            {/* Actions - Navigate to Step 3 */}
                            <div className="flex items-center gap-4 pt-6 mt-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseForm}
                                    className="flex-1 h-12 text-base rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => setFormStep(3)}
                                    disabled={!formData.title || !formData.start_time || !formData.end_time}
                                    className="flex-1 h-12 text-base rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10"
                                >
                                    Next: Select Attendees
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Attendee Selection */}
                    {formStep === 3 && (
                        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Who's Attending?</h3>
                            <p className="text-slate-500 text-sm mb-6">Select team members who will attend this activity.</p>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 overflow-hidden">
                                <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                                    {users?.map((u: any) => {
                                        const isSelected = formData.attendee_ids.includes(u.id)
                                        return (
                                            <label
                                                key={u.id}
                                                className={`flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-indigo-50' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        if (isSelected) {
                                                            setFormData({
                                                                ...formData,
                                                                attendee_ids: formData.attendee_ids.filter(id => id !== u.id)
                                                            })
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                attendee_ids: [...formData.attendee_ids, u.id]
                                                            })
                                                        }
                                                    }}
                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                                                    {u.full_name?.[0] || u.email?.[0] || 'U'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 truncate">{u.full_name || u.email}</p>
                                                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-5 h-5 text-indigo-600" />
                                                )}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            {formData.attendee_ids.length > 0 && (
                                <div className="mt-4 text-sm text-slate-600">
                                    <span className="font-semibold text-indigo-600">{formData.attendee_ids.length}</span> attendee{formData.attendee_ids.length !== 1 ? 's' : ''} selected
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-6 mt-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setFormStep(2)}
                                    className="flex-1 h-12 text-base rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isSaving}
                                    className="flex-1 h-12 text-base rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10"
                                >
                                    {isSaving ? 'Saving...' : editingActivity ? 'Save Changes' : 'Create Activity'}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer Container */}
            <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">

                {/* Header (Only show in List View) */}
                {view === 'list' && (
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white z-20">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar</h2>
                            <p className="text-slate-500 text-sm font-medium">Manage team schedule & events</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {/* View Switching Logic */}
                    {view === 'list' ? renderAgendaView() : renderFormView()}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Activity?</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                This will permanently remove this item from the calendar. This action cannot be undone.
                            </p>
                            <div className="flex gap-3 w-full">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl h-11"
                                    onClick={() => setDeleteConfirmId(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-11"
                                    onClick={() => handleDelete(deleteConfirmId)}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
