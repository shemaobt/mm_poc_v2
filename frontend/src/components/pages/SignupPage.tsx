import { useState } from 'react'
import { User, Mail, Lock, EyeOff, Eye, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { errorStateStyles, stageHeaderStyles } from '@/styles'

interface SignupPageProps {
    onSwitchToLogin: () => void
}

export default function SignupPage({ onSwitchToLogin }: SignupPageProps) {
    const { signup } = useAuth()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            await signup(username, email, password)
            setSuccess(true)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-branco px-6">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-verde-claro/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-verde-claro" />
                    </div>
                    <h1 className={`${stageHeaderStyles.title} mb-2`}>Account Created!</h1>
                    <p className="text-verde mb-6">
                        Your account is pending admin approval. You'll be able to sign in once approved.
                    </p>
                    <button
                        onClick={onSwitchToLogin}
                        className="px-6 py-3 bg-telha text-white font-semibold rounded-xl hover:bg-telha-dark transition-all"
                    >
                        Back to Sign In
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-branco px-6">
            {/* Branding */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold">
                    <span className="text-telha">Shema</span>
                    <span className="text-preto">Meaning Maps</span>
                </h1>
                <p className="text-verde mt-2">Create your account</p>
            </div>

            {/* Signup Form */}
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

                {/* Email Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-verde/50" />
                    </div>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-areia/50 rounded-xl text-preto placeholder-verde/50 focus:outline-none focus:ring-2 focus:ring-telha/30 focus:border-telha transition-all"
                        autoComplete="email"
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
                        autoComplete="new-password"
                        required
                        minLength={6}
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
                    disabled={loading || !username || !email || !password}
                    className="w-full py-4 bg-telha text-white font-semibold rounded-xl hover:bg-telha-dark disabled:bg-areia disabled:text-verde/50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                        'Create Account'
                    )}
                </button>
            </form>

            {/* Login Link */}
            <p className="mt-8 text-verde">
                Already have an account?{' '}
                <button
                    onClick={onSwitchToLogin}
                    className="text-telha font-medium hover:underline"
                >
                    Sign in
                </button>
            </p>

            {/* Tagline */}
            <p className="mt-8 text-verde/60 text-sm">
                Semantic Analysis of Biblical Hebrew
            </p>
        </div>
    )
}
