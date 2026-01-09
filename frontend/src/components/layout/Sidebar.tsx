import { useState } from 'react'
import { BarChart3, Layout, FolderOpen, Menu, ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'
import { Button } from '../ui/button'
import { ViewType } from '../../App'
import { useAuth } from '../../contexts/AuthContext'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '../ui/sheet'

interface SidebarProps {
    currentView?: ViewType
    onViewChange?: (view: ViewType) => void
    isCollapsed?: boolean
    setIsCollapsed?: (collapsed: boolean) => void
}

export default function Sidebar({ currentView, onViewChange, isCollapsed: externalIsCollapsed, setIsCollapsed: externalSetIsCollapsed }: SidebarProps) {
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
    const { user, isAdmin, logout } = useAuth()

    // Use external state if provided, otherwise use internal state
    const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed
    const setIsCollapsed = externalSetIsCollapsed || setInternalIsCollapsed

    // Filter menu items based on role
    const allMenuItems = [
        { id: 'analysis' as ViewType, label: 'Editor', icon: Layout, adminOnly: false },
        { id: 'saved-maps' as ViewType, label: 'Saved Maps', icon: FolderOpen, adminOnly: false },
        { id: 'admin-dashboard' as ViewType, label: 'Dashboard', icon: BarChart3, adminOnly: true },
    ]

    const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin)

    const handleNavClick = (view: ViewType) => {
        onViewChange?.(view)
        setIsMobileOpen(false)
    }

    const handleLogout = () => {
        logout()
        setIsMobileOpen(false)
    }

    const SidebarContent = ({ isCollapsed: collapsed = false }: { isCollapsed?: boolean }) => (
        <div className="flex flex-col h-full overflow-hidden pt-4">

            {/* Navigation */}
            {onViewChange && (
                <nav className={`flex-1 space-y-1 transition-all duration-300 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'}`}>
                    {menuItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentView === item.id
                        return (
                            <Button
                                key={item.id}
                                variant="ghost"
                                className={`
                                    w-full h-10
                                    hover:bg-telha/10 hover:text-telha
                                    transition-all duration-200
                                    ${collapsed ? 'justify-center px-2' : 'justify-start gap-3 px-3'}
                                    ${isActive
                                        ? 'bg-telha/15 text-telha shadow-sm border-l-2 border-telha font-semibold'
                                        : 'text-verde/80'
                                    }
                                `}
                                onClick={() => handleNavClick(item.id)}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-telha' : 'text-verde/70'}`} />
                                {!collapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                            </Button>
                        )
                    })}
                </nav>
            )}

            {/* User info and actions */}
            <div className="border-t border-areia/30 shrink-0 mt-auto">
                {/* User card */}
                {user && (
                    <div className={`${collapsed ? 'p-2' : 'px-3 py-3'}`}>
                        <div className={`${collapsed ? '' : 'flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-areia/30 to-transparent'}`}>
                            {/* Avatar */}
                            <div className={`shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-telha to-telha-dark flex items-center justify-center text-white font-bold text-sm shadow-md ${collapsed ? 'mx-auto' : ''}`}>
                                {user.username.charAt(0).toUpperCase()}
                            </div>

                            {/* User details */}
                            {!collapsed && (
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-preto text-sm truncate">
                                        {user.username}
                                    </div>
                                    {isAdmin && (
                                        <span className="inline-flex items-center px-2 py-0.5 bg-telha/15 text-telha rounded-md text-[10px] font-bold uppercase tracking-wide mt-0.5">
                                            Admin
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className={`flex ${collapsed ? 'flex-col items-center gap-1 p-2' : 'items-center justify-between px-3 pb-3'}`}>
                    {/* Logout button */}
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className={`${collapsed ? 'w-9 h-9 p-0' : 'h-8 px-3'} text-verde/60 hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-colors`}
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                        {!collapsed && <span className="text-xs ml-2">Logout</span>}
                    </Button>

                    {/* Toggle button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-8 h-8 text-verde/50 hover:text-telha hover:bg-telha/10 rounded-lg"
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? (
                            <ChevronsRight className="w-4 h-4" />
                        ) : (
                            <ChevronsLeft className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop Sidebar - Collapsible on lg+ */}
            <aside
                className={`
                    hidden lg:flex fixed left-0 top-16 h-[calc(100vh-4rem)] bg-branco text-preto z-20 shadow-lg border-r border-areia/50
                    transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'w-20' : 'w-64'}
                `}
            >
                <SidebarContent isCollapsed={isCollapsed} />
            </aside>

            {/* Mobile Sidebar - Sheet */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="w-80 p-0 bg-branco border-r border-areia/50">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Navigation</SheetTitle>
                        <SheetDescription>Main navigation menu</SheetDescription>
                    </SheetHeader>
                    <SidebarContent isCollapsed={false} />
                </SheetContent>
            </Sheet>

            {/* Toggle button - Mobile only */}
            <Button
                onClick={() => setIsMobileOpen(true)}
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden h-10 w-10 bg-branco text-telha hover:bg-areia/30 shadow-lg border border-areia/50"
            >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
            </Button>
        </>
    )
}
