/**
 * PendingApprovalPage - Shown when user is logged in but not yet approved
 */
import { Clock, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function PendingApprovalPage() {
    const { user, logout, refreshUser } = useAuth()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-branco px-6">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-telha/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10 text-telha" />
                </div>

                <h1 className="text-2xl font-bold text-preto mb-2">
                    Pending Approval
                </h1>

                <p className="text-verde mb-2">
                    Hi <span className="font-medium text-preto">{user?.username}</span>,
                </p>

                <p className="text-verde mb-6">
                    Your account is awaiting admin approval. You'll be notified once your access has been granted.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={refreshUser}
                        className="px-6 py-3 bg-telha text-white font-semibold rounded-xl hover:bg-telha-dark transition-all"
                    >
                        Check Status
                    </button>
                    <button
                        onClick={logout}
                        className="px-6 py-3 bg-white border border-areia text-verde font-semibold rounded-xl hover:bg-areia/20 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Footer */}
            <p className="absolute bottom-8 text-verde/60 text-sm">
                <span className="text-telha font-medium">Shema</span>
                <span>Meaning Maps</span>
            </p>
        </div>
    )
}
