import { useState, useEffect } from 'react'
import { userProgressAPI, UserProgress as UserProgressType } from '../../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { errorStateStyles } from '@/styles'
import {
    Users,
    CheckCircle2,
    Clock,
    Lock,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Activity
} from 'lucide-react'

export default function UserProgressDashboard() {
    const [progress, setProgress] = useState<UserProgressType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

    const fetchProgress = async () => {
        try {
            setLoading(true)
            const data = await userProgressAPI.getProgress()
            setProgress(data.users)
            setError(null)
        } catch (err: any) {
            console.error('Failed to fetch user progress:', err)
            setError('Failed to load user progress data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProgress()
        const interval = setInterval(fetchProgress, 30000)
        return () => clearInterval(interval)
    }, [])

    const toggleExpand = (userId: string) => {
        const newSet = new Set(expandedUsers)
        if (newSet.has(userId)) {
            newSet.delete(userId)
        } else {
            newSet.add(userId)
        }
        setExpandedUsers(newSet)
    }

    const formatTimeAgo = (isoString: string): string => {
        const date = new Date(isoString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    if (loading && progress.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-telha border-t-transparent rounded-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <div className={`${errorStateStyles.banner} inline-block`}>
                        {error}
                    </div>
                    <div className="mt-4">
                        <Button onClick={fetchProgress}>Try Again</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const totalCompleted = progress.reduce((acc, u) => acc + u.completedPassages, 0)
    const totalInProgress = progress.reduce((acc, u) => acc + u.inProgressPassages, 0)
    const totalActiveLocks = progress.reduce((acc, u) => acc + u.currentLocks.length, 0)
    const activeUsers = progress.filter(u => u.currentLocks.length > 0).length

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-telha" />
                            User Progress
                        </CardTitle>
                        <CardDescription>
                            Track who is working on which pericopes
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchProgress} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-preto">{activeUsers}</div>
                        <div className="text-sm text-gray-500">Active Now</div>
                    </div>
                    <div className="bg-verde-claro/10 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-verde-claro">{totalCompleted}</div>
                        <div className="text-sm text-gray-500">Completed</div>
                    </div>
                    <div className="bg-telha/10 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-telha">{totalInProgress}</div>
                        <div className="text-sm text-gray-500">In Progress</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-amber-600">{totalActiveLocks}</div>
                        <div className="text-sm text-gray-500">Active Locks</div>
                    </div>
                </div>

                <div className="space-y-3">
                    {progress.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No approved users yet
                        </div>
                    ) : (
                        progress.map((user) => {
                            const isExpanded = expandedUsers.has(user.id)
                            const isActive = user.currentLocks.length > 0

                            return (
                                <div
                                    key={user.id}
                                    className={`border rounded-lg transition-all ${isActive ? 'border-verde-claro/50 bg-verde-claro/5' : 'border-gray-200'}`}
                                >
                                    {/* User Header */}
                                    <button
                                        onClick={() => toggleExpand(user.id)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-verde-claro/20 text-verde-claro' : 'bg-gray-100 text-gray-500'}`}>
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-preto">{user.username}</span>
                                                    {user.role === 'admin' && (
                                                        <Badge variant="default" className="text-xs">Admin</Badge>
                                                    )}
                                                    {isActive && (
                                                        <span className="flex items-center gap-1 text-xs text-verde-claro">
                                                            <Activity className="w-3 h-3" />
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1 text-verde-claro" title="Completed">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span>{user.completedPassages}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-telha" title="In Progress">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{user.inProgressPassages}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-amber-600" title="Active Locks">
                                                    <Lock className="w-4 h-4" />
                                                    <span>{user.currentLocks.length}</span>
                                                </div>
                                            </div>

                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                                            {user.currentLocks.length > 0 ? (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4" />
                                                        Currently Working On:
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {user.currentLocks.map((lock) => (
                                                            <div
                                                                key={lock.pericopeRef}
                                                                className="flex items-center justify-between bg-white border border-gray-100 rounded-md px-3 py-2"
                                                            >
                                                                <span className="font-medium text-preto">{lock.pericopeRef}</span>
                                                                <div className="text-xs text-gray-500">
                                                                    Started {formatTimeAgo(lock.startedAt)} •
                                                                    Last activity {formatTimeAgo(lock.lastActivity)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500 text-center py-2">
                                                    Not currently analyzing any pericopes
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

