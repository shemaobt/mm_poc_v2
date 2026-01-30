import { useState } from 'react'
import { User, Lock, EyeOff, Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { errorStateStyles } from '@/styles'

interface LoginPageProps {
    onSwitchToSignup: () => void
}

export default function LoginPage({ onSwitchToSignup }: LoginPageProps) {
    const { login } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            await login(username, password)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid username or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-branco px-6">
            {/* Branding */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold">
                    <span className="text-telha">Shema</span>
                    <span className="text-preto">Meaning Maps</span>
                </h1>
                <p className="text-verde mt-2">Welcome back! Please sign in to continue</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                {error && (
                    <div className={errorStateStyles.banner}>
                        {error}
                    </div>
                )}

                {/* Username Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-verde/50" />
                    </div>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-areia/50 rounded-xl text-preto placeholder-verde/50 focus:outline-none focus:ring-2 focus:ring-telha/30 focus:border-telha transition-all"
                        autoComplete="username"
                        required
                    />
                </div>

                {/* Password Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-verde/50" />
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-white border border-areia/50 rounded-xl text-preto placeholder-verde/50 focus:outline-none focus:ring-2 focus:ring-telha/30 focus:border-telha transition-all"
                        autoComplete="current-password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-4 flex items-center text-verde/50 hover:text-verde transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !username || !password}
                    className="w-full py-4 bg-telha text-white font-semibold rounded-xl hover:bg-telha-dark disabled:bg-areia disabled:text-verde/50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>

            {/* Signup Link */}
            <p className="mt-8 text-verde">
                Don't have an account?{' '}
                <button
                    onClick={onSwitchToSignup}
                    className="text-telha font-medium hover:underline"
                >
                    Sign up
                </button>
            </p>

            {/* Tagline */}
            <p className="mt-8 text-verde/60 text-sm">
                Semantic Analysis of Biblical Hebrew
            </p>
        </div>
    )
}
