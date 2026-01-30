import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI, User } from '../services/api'

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isAdmin: boolean
    isApproved: boolean
    isLoading: boolean
    login: (username: string, password: string) => Promise<void>
    signup: (username: string, email: string, password: string) => Promise<void>
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'mm_auth_token'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem(TOKEN_KEY)
            if (token) {
                try {
                    const userData = await authAPI.me()
                    setUser(userData)
                } catch (error) {
                    localStorage.removeItem(TOKEN_KEY)
                }
            }
            setIsLoading(false)
        }
        initAuth()
    }, [])

    const login = async (username: string, password: string) => {
        const { access_token } = await authAPI.login(username, password)
        localStorage.setItem(TOKEN_KEY, access_token)

        const userData = await authAPI.me()
        setUser(userData)
    }

    const signup = async (username: string, email: string, password: string) => {
        await authAPI.signup(username, email, password)
    }

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
    }

    const refreshUser = async () => {
        try {
            const userData = await authAPI.me()
            setUser(userData)
        } catch (error) {
            logout()
        }
    }

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isAdmin: user?.roles?.includes('admin') ?? false,
        isApproved: user?.isApproved ?? false,
        isLoading,
        login,
        signup,
        logout,
        refreshUser
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
