import { useState, useEffect } from 'react'
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
import { ChevronLeft, ChevronRight, FolderOpen, Lock } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { usePassageStore } from './stores/passageStore'
import { passagesAPI, bhsaAPI } from './services/api'
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

function AuthenticatedApp() {
    const { isAuthenticated, isApproved, isLoading } = useAuth()
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')

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

    if (!isAuthenticated) {
        if (authMode === 'signup') {
            return <SignupPage onSwitchToLogin={() => setAuthMode('login')} />
        }
        return <LoginPage onSwitchToSignup={() => setAuthMode('signup')} />
    }

    if (!isApproved) {
        return <PendingApprovalPage />
    }

    return <MainApp />
}

function MainApp() {
    const [currentStage, setCurrentStage] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const stageParam = params.get('stage')
            if (stageParam) {
                const stage = parseInt(stageParam, 10)
                if (!isNaN(stage) && stage >= 1 && stage <= 5) {
                    return stage
                }
            }
        }
        return 1
    })

    useEffect(() => {
        const handlePopState = () => {
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search)
                const stageParam = params.get('stage')
                if (stageParam) {
                    const stage = parseInt(stageParam, 10)
                    if (!isNaN(stage) && stage >= 1 && stage <= 5) {
                        setCurrentStage(stage)
                    }
                } else {
                    setCurrentStage(1)
                }
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('stage') !== currentStage.toString()) {
            params.set('stage', currentStage.toString())
            const newUrl = `${window.location.pathname}?${params.toString()}`
            window.history.pushState({ ...window.history.state, stage: currentStage }, '', newUrl)
        }
    }, [currentStage])
    const [currentView, setCurrentView] = useState<ViewType>('analysis')
    const [isCollapsed, setIsCollapsed] = useState(true)
    const { isAdmin } = useAuth()

    const {
        participants,
        relations,
        events,
        validated,
        passageData,
        readOnly,
        setPassageData,
        setParticipants,
        setRelations,
        setEvents,
        setDiscourse,
        clearPassage,
        discardSession,
        setReadOnly,
        validateAll,
    } = usePassageStore()

    const stages = [
        { id: 1, component: Stage1Syntax },
        { id: 2, component: Stage2Participants },
        { id: 3, component: Stage3Relations },
        { id: 4, component: Stage4Events },
        { id: 5, component: Stage5Discourse },
    ]

    const CurrentStageComponent = stages.find(s => s.id === currentStage)?.component || Stage1Syntax

    const isStageValidated = (stage: number): boolean => {
        switch (stage) {
            case 1:
                return !!passageData?.id
            case 2:
                return participants.length === 0 || participants.every(p => validated.participants.has(p.id))
            case 3:
                return relations.length === 0 || relations.every(r => validated.relations.has(r.id))
            case 4:
                return events.length === 0 || events.every(e => validated.events.has(e.id))
            case 5:
                return true
            default:
                return true
        }
    }

    const getValidationMessage = (stage: number): string => {
        switch (stage) {
            case 1:
                return 'Please load a passage before proceeding.'
            case 2:
                const unvalidatedParticipants = participants.filter(p => !validated.participants.has(p.id)).length
                return `Please validate all participants (${unvalidatedParticipants} remaining).`
            case 3:
                const unvalidatedRelations = relations.filter(r => !validated.relations.has(r.id)).length
                return `Please validate all relations (${unvalidatedRelations} remaining).`
            case 4:
                const unvalidatedEvents = events.filter(e => !validated.events.has(e.id)).length
                return `Please validate all events (${unvalidatedEvents} remaining).`
            default:
                return 'Please complete all validations before proceeding.'
        }
    }

    const handleOpenPassage = async (passageId: string, readOnly: boolean) => {
        const id = String(passageId ?? '').trim()
        if (!id) {
            toast.error('Invalid passage')
            return
        }
        try {
            discardSession()
            setReadOnly(readOnly)
            const passage = await passagesAPI.get(id)
            if (String(passage?.id ?? '') !== id) {
                toast.error('Passage data mismatch')
                return
            }
            const clauses = (passage.clauses || []).map((c: any) => ({
                clause_id: c.clauseIndex ?? c.clause_index ?? 0,
                verse: c.verse,
                text: c.text,
                gloss: c.gloss,
                clause_type: c.clauseType ?? c.clause_type ?? '',
                is_mainline: c.isMainline ?? c.is_mainline ?? false,
                has_ki: c.hasKi ?? c.has_ki ?? false,
                chain_position: c.chainPosition ?? c.chain_position,
                lemma: c.lemma,
                lemma_ascii: c.lemmaAscii ?? c.lemma_ascii,
                binyan: c.binyan,
                tense: c.tense,
                subjects: c.subjects,
                objects: c.objects,
                names: c.names,
                freeTranslation: c.freeTranslation ?? c.free_translation,
            }))
            const passageDataPayload = {
                id: passage.id,
                reference: passage.reference,
                source_lang: passage.sourceLang ?? passage.source_lang ?? 'hbo',
                clauses,
                display_units: passage.displayUnits ?? passage.display_units ?? undefined,
            }
            setReadOnly(readOnly)
            setPassageData(passageDataPayload)
            setCurrentView('analysis')
            setCurrentStage(1)
            toast.success(readOnly ? 'Opened in view-only mode' : 'Passage loaded')

            const [participantsResult, relationsResult, eventsResult, discourseResult] = await Promise.allSettled([
                bhsaAPI.getParticipants(id),
                bhsaAPI.getRelations(id),
                bhsaAPI.getEvents(id),
                bhsaAPI.getDiscourse(id),
            ])
            const participantsList = participantsResult.status === 'fulfilled' && Array.isArray(participantsResult.value) ? participantsResult.value : []
            const relationsList = relationsResult.status === 'fulfilled' && Array.isArray(relationsResult.value) ? relationsResult.value : []
            const eventsList = eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value) ? eventsResult.value : []
            const discourseList = discourseResult.status === 'fulfilled' && Array.isArray(discourseResult.value) ? discourseResult.value : []
            const norm = (arr: any[], key = 'id') => arr.map((x: any) => ({ ...x, [key]: String(x[key] ?? '') }))
            const normP = norm(participantsList)
            const normR = norm(relationsList)
            const normE = norm(eventsList)
            const normD = norm(discourseList)
            setParticipants(normP)
            setRelations(normR)
            setEvents(normE)
            setDiscourse(normD)
            const pIds = normP.map((p: any) => p.id).filter(Boolean)
            const rIds = normR.map((r: any) => r.id).filter(Boolean)
            const eIds = normE.map((e: any) => e.id).filter(Boolean)
            const dIds = normD.map((d: any) => d.id).filter(Boolean)
            if (pIds.length) validateAll('participants', pIds)
            if (rIds.length) validateAll('relations', rIds)
            if (eIds.length) validateAll('events', eIds)
            if (dIds.length) validateAll('discourse', dIds)
        } catch (err: any) {
            const msg = err?.response?.data?.detail ?? err?.message ?? 'Failed to open passage'
            console.error('Open passage failed:', err)
            toast.error(typeof msg === 'string' ? msg : 'Passage not found or unavailable')
        }
    }

    const goToPrevious = () => {
        if (currentStage > 1) setCurrentStage(currentStage - 1)
    }

    const goToNext = () => {
        if (currentStage < 5) {
            if (!readOnly && !isStageValidated(currentStage)) {
                toast.warning('Incomplete Validation', {
                    description: getValidationMessage(currentStage)
                })
            }
            setCurrentStage(currentStage + 1)
        }
    }

    const handleStageClick = (stage: number) => {
        if (currentStage === 1 && !passageData?.id && stage > 1) {
            toast.error('Please load a passage first')
            return
        }
        
        if (!readOnly && !isStageValidated(currentStage) && stage !== currentStage) {
            toast.warning('Incomplete Validation', {
                description: getValidationMessage(currentStage)
            })
        }
        
        setCurrentStage(stage)
    }

    const canProceed = isStageValidated(currentStage)

    const goToEditorHome = () => {
        clearPassage()
        setReadOnly(false)
        setCurrentView('analysis')
        setCurrentStage(1)
    }

    if (currentView === 'admin-dashboard' && !isAdmin) {
        setCurrentView('analysis')
    }

    if (currentView === 'saved-maps') {
        return (
            <SidebarProvider value={{ isCollapsed, setIsCollapsed }}>
                <div className="min-h-screen bg-branco">
                    <Sidebar currentView={currentView} onViewChange={setCurrentView} onEditorHome={goToEditorHome} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                    <Header />
                    <ContentWrapper className="w-full">
                        <main className="max-w-6xl mx-auto px-6 py-8">
                            <SavedMapsPage onBack={goToEditorHome} onOpenPassage={handleOpenPassage} />
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
                    <Sidebar currentView={currentView} onViewChange={setCurrentView} onEditorHome={goToEditorHome} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
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
                <Sidebar currentView={currentView} onViewChange={setCurrentView} onEditorHome={goToEditorHome} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                <Header />
                <ContentWrapper>
                    <ProgressBar currentStage={currentStage} totalStages={5} onStageClick={handleStageClick} />

                    <div className="max-w-6xl mx-auto px-6 pt-4">
                        <button
                            onClick={() => setCurrentView('saved-maps')}
                            className="flex items-center gap-2 text-sm text-verde hover:text-telha transition-colors"
                        >
                            <FolderOpen className="w-4 h-4" />
                            My Saved Maps
                        </button>
                    </div>

                    <main className="max-w-6xl mx-auto px-6 py-4">
                        <div className="animate-in">
                            <CurrentStageComponent />
                        </div>
                    </main>
                </ContentWrapper>

                <div
                    className={`fixed bottom-6 right-6 flex justify-between pointer-events-none z-30 transition-all duration-300 ${isCollapsed ? 'left-[104px] lg:left-[104px]' : 'left-6 lg:left-[280px]'}`}
                >
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

                    <button
                        onClick={goToNext}
                        disabled={currentStage === 5}
                        className={`
                            pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full font-semibold shadow-lg transition-all duration-200
                            ${currentStage === 5
                                ? 'bg-areia/50 text-verde/40 cursor-not-allowed'
                                : canProceed
                                    ? 'bg-telha text-white hover:bg-telha-dark hover:shadow-xl active:scale-95'
                                    : 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-xl active:scale-95'
                            }
                        `}
                    >
                        {!canProceed && currentStage < 5 && <Lock className="w-4 h-4" />}
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
