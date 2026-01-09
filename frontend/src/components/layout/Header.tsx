import { useSidebar } from '../../contexts/SidebarContext'

function Header() {
    const { isCollapsed } = useSidebar()

    return (
        <header className="sticky top-0 z-30 bg-branco/95 backdrop-blur-md shadow-sm border-b border-areia/30">
            <div className={`h-16 flex items-center justify-center transition-all duration-300 w-full ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                {/* Centered branding - clean and minimal like ShemaTranslation */}
                <div className="flex flex-col items-center">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        <span className="text-telha">Shema</span>
                        <span className="text-preto">Meaning Maps</span>
                    </h1>
                </div>
            </div>
        </header>
    )
}

export default Header
