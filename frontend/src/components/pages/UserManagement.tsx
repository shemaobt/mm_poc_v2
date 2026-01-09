/**
 * UserManagement - Admin section for managing user approvals and roles
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { usersAPI, User } from '../../services/api'
import { UserCheck, UserX, Shield, RefreshCw } from 'lucide-react'

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const loadUsers = async () => {
        try {
            setLoading(true)
            const data = await usersAPI.list()
            setUsers(data.users || [])
            setError(null)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadUsers()
    }, [])

    const handleApprove = async (userId: string) => {
        try {
            setActionLoading(userId)
            await usersAPI.approve(userId)
            setUsers(users.map(u => u.id === userId ? { ...u, isApproved: true } : u))
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to approve user')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (userId: string) => {
        try {
            setActionLoading(userId)
            await usersAPI.reject(userId)
            setUsers(users.map(u => u.id === userId ? { ...u, isApproved: false } : u))
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to reject user')
        } finally {
            setActionLoading(null)
        }
    }

    const handleToggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin'
        try {
            setActionLoading(userId)
            await usersAPI.updateRole(userId, newRole)
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u))
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update role')
        } finally {
            setActionLoading(null)
        }
    }

    const pendingUsers = users.filter(u => !u.isApproved)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Approve new users and manage roles</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Pending Users */}
                {pendingUsers.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                            Pending Approval ({pendingUsers.length})
                        </h3>
                        <div className="space-y-2">
                            {pendingUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div>
                                        <span className="font-medium text-gray-900">{user.username}</span>
                                        <span className="text-gray-500 text-sm ml-2">{user.email}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprove(user.id)}
                                            disabled={actionLoading === user.id}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <UserCheck className="w-4 h-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReject(user.id)}
                                            disabled={actionLoading === user.id}
                                            className="text-red-600 border-red-300 hover:bg-red-50"
                                        >
                                            <UserX className="w-4 h-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Users Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3">Username</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={user.isApproved ? 'default' : 'secondary'} className={user.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                            {user.isApproved ? 'Approved' : 'Pending'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleToggleRole(user.id, user.role)}
                                                disabled={actionLoading === user.id}
                                                title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                                            >
                                                <Shield className={`w-4 h-4 ${user.role === 'admin' ? 'text-telha' : 'text-gray-400'}`} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
