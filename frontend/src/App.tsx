import { useState } from 'react'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import ProgressBar from './components/layout/ProgressBar'
import Stage1Syntax from './components/stages/Stage1Syntax'
import Stage2Participants from './components/stages/Stage2Participants'
import Stage3Relations from './components/stages/Stage3Relations'
import Stage4Events from './components/stages/Stage4Events'
import Stage5Discourse from './components/stages/Stage5Discourse'
import SavedMapsPage from './components/pages/SavedMapsPage'
import AdminDashboard from './components/pages/AdminDashboard'
import LoginPage from './components/pages/LoginPage'
import SignupPage from './components/pages/SignupPage'
import PendingApprovalPage from './components/pages/PendingApprovalPage'
import { ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react'
import { Toaster } from 'sonner'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './styles/main.css'

export type ViewType = 'analysis' | 'saved-maps' | 'admin-dashboard'

function ContentWrapper({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    const { isCollapsed } = useSidebar()
    return (
        <div
            className={`transition-all duration-300 w-full ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'} ${className}`}
            style={{
                position: 'relative',
                zIndex: 10
            }}
        >
            {children}
        </div>
    )
}

// Auth wrapper component
function AuthenticatedApp() {
    const { isAuthenticated, isApproved, isLoading } = useAuth()
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-branco">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-telha border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-verde">Loading...</p>
                </div>
            </div>
        )
    }

    // Not authenticated - show login or signup
    if (!isAuthenticated) {
        if (authMode === 'signup') {
            return <SignupPage onSwitchToLogin={() => setAuthMode('login')} />
        }
        return <LoginPage onSwitchToSignup={() => setAuthMode('signup')} />
    }

    // Authenticated but not approved
    if (!isApproved) {
        return <PendingApprovalPage />
    }

    // Authenticated and approved - show main app
    return <MainApp />
}

function MainApp() {
    const [currentStage, setCurrentStage] = useState(1)
    const [currentView, setCurrentView] = useState<ViewType>('analysis')
    const [isCollapsed, setIsCollapsed] = useState(true)
    const { isAdmin } = useAuth()

    const stages = [
        { id: 1, component: Stage1Syntax },
        { id: 2, component: Stage2Participants },
        { id: 3, component: Stage3Relations },
        { id: 4, component: Stage4Events },
        { id: 5, component: Stage5Discourse },
    ]

    const CurrentStageComponent = stages.find(s => s.id === currentStage)?.component || Stage1Syntax

    const goToPrevious = () => {
        if (currentStage > 1) setCurrentStage(currentStage - 1)
    }

    const goToNext = () => {
        if (currentStage < 5) setCurrentStage(currentStage + 1)
    }

    // Redirect non-admins away from dashboard
    if (currentView === 'admin-dashboard' && !isAdmin) {
        setCurrentView('analysis')
    }

    // Views
    if (currentView === 'saved-maps') {
        return (
            <SidebarProvider value={{ isCollapsed, setIsCollapsed }}>
                <div className="min-h-screen bg-branco">
                    <Sidebar currentView={currentView} onViewChange={setCurrentView} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                    <Header />
                    <ContentWrapper className="w-full">
                        <main className="max-w-6xl mx-auto px-6 py-8">
                            <SavedMapsPage onBack={() => setCurrentView('analysis')} />
                        </main>
                    </ContentWrapper>
                </div>
            </SidebarProvider>
        )
    }

    if (currentView === 'admin-dashboard' && isAdmin) {
        return (
            <SidebarProvider value={{ isCollapsed, setIsCollapsed }}>
                <div className="min-h-screen bg-branco">
                    <Sidebar currentView={currentView} onViewChange={setCurrentView} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                    <Header />
                    <ContentWrapper>
                        <main className="max-w-7xl mx-auto px-6 py-8">
                            <AdminDashboard />
                        </main>
                    </ContentWrapper>
                    <Toaster position="top-center" richColors />
                </div>
            </SidebarProvider>
        )
    }

    return (
        <SidebarProvider value={{ isCollapsed, setIsCollapsed }}>
            <div className="min-h-screen bg-branco pb-20">
                <Sidebar currentView={currentView} onViewChange={setCurrentView} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                <Header />
                <ContentWrapper>
                    <ProgressBar currentStage={currentStage} totalStages={5} />

                    {/* My Maps button */}
                    <div className="max-w-6xl mx-auto px-6 pt-4">
                        <button
                            onClick={() => setCurrentView('saved-maps')}
                            className="flex items-center gap-2 text-sm text-verde hover:text-telha transition-colors"
                        >
                            <FolderOpen className="w-4 h-4" />
                            My Saved Maps
                        </button>
                    </div>

                    {/* Main content */}
                    <main className="max-w-6xl mx-auto px-6 py-4">
                        <div className="animate-in">
                            <CurrentStageComponent />
                        </div>
                    </main>
                </ContentWrapper>

                {/* Floating navigation buttons */}
                <div
                    className={`fixed bottom-6 right-6 flex justify-between pointer-events-none z-30 transition-all duration-300 ${isCollapsed ? 'left-[104px] lg:left-[104px]' : 'left-6 lg:left-[280px]'}`}
                >
                    {/* Previous button */}
                    <button
                        onClick={goToPrevious}
                        disabled={currentStage === 1}
                        className={`
                            pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full font-semibold shadow-lg transition-all duration-200
                            ${currentStage === 1
                                ? 'bg-areia/50 text-verde/40 cursor-not-allowed'
                                : 'bg-white text-preto border border-areia hover:bg-areia/20 hover:shadow-xl active:scale-95'
                            }
                        `}
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back
                    </button>

                    {/* Next button */}
                    <button
                        onClick={goToNext}
                        disabled={currentStage === 5}
                        className={`
                            pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full font-semibold shadow-lg transition-all duration-200
                            ${currentStage === 5
                                ? 'bg-areia/50 text-verde/40 cursor-not-allowed'
                                : 'bg-telha text-white hover:bg-telha-dark hover:shadow-xl active:scale-95'
                            }
                        `}
                    >
                        Next
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <Toaster position="top-center" richColors />
            </div>
        </SidebarProvider>
    )
}

function App() {
    return (
        <AuthProvider>
            <AuthenticatedApp />
        </AuthProvider>
    )
}

export default App
