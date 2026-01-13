import { createContext, useContext } from 'react'

interface SidebarContextType {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
    isCollapsed: false,
    setIsCollapsed: () => {},
})

export const useSidebar = () => useContext(SidebarContext)
export const SidebarProvider = SidebarContext.Provider


