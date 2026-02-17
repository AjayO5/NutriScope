'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [errorMSG, setErrorMSG] = useState<string | null>(null)

    // Form Fields
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMSG(null)

        try {
            if (isLogin) {
                // Login Logic
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                console.log('Login attempt:', { email, error, data })
                if (error) throw error

                console.log('Login success', data)

                if (data.session) {
                    // Check Profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', data.session.user.id)
                        .single()

                    if (profile) {
                        console.log('Profile found, redirecting to /')
                        router.push('/')
                        router.refresh()
                    } else {
                        console.log('No profile found, redirecting to /onboarding')
                        router.push('/onboarding')
                        router.refresh()
                    }
                }
            } else {
                // Signup Logic
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                        },
                    },
                })
                if (error) throw error

                // Redirect to onboarding after successful signup
                router.push('/onboarding')
            }
        } catch (err: any) {
            setErrorMSG(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 sm:p-8">
            {/* Background Blobs */}
            <motion.div
                animate={{
                    x: [0, 20, 0],
                    y: [0, -20, 0],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-green-300/30 blur-3xl filter"
            />
            <motion.div
                animate={{
                    x: [0, -20, 0],
                    y: [0, 20, 0],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl filter"
            />

            {/* Glass Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/40 bg-white/20 p-8 shadow-xl backdrop-blur-xl"
            >
                <div className="mb-8 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold tracking-tight text-gray-800 drop-shadow-sm"
                    >
                        NutriScope
                    </motion.h1>
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={isLogin ? 'login-text' : 'signup-text'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-2 text-sm font-medium text-gray-600"
                        >
                            {isLogin ? 'Welcome back!' : 'Create your account'}
                        </motion.p>
                    </AnimatePresence>
                </div>

                <form className="space-y-5" onSubmit={handleAuth}>
                    <AnimatePresence mode="popLayout">
                        {!isLogin && (
                            <motion.div
                                key="username-field"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <label htmlFor="username" className="sr-only">Username</label>
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-gray-800 placeholder-gray-500 shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition-all focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    required={!isLogin}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div layout>
                        <label htmlFor="email" className="sr-only">
                            {isLogin ? 'Email or Username' : 'Email'}
                        </label>
                        <input
                            id="email"
                            type="text"
                            placeholder={isLogin ? 'Email or Username' : 'Email address'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-gray-800 placeholder-gray-500 shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition-all focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                        />
                    </motion.div>

                    <motion.div layout>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border-0 bg-white/60 px-4 py-3 text-gray-800 placeholder-gray-500 shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition-all focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                        />
                    </motion.div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full rounded-xl bg-green-500 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-green-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                    </motion.button>

                    {errorMSG && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 text-red-500 text-sm text-center"
                        >
                            {errorMSG}
                        </motion.div>
                    )}
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin)
                                setErrorMSG(null)
                                setEmail('')
                                setPassword('')
                                setUsername('')
                            }}
                            className="font-semibold text-green-700 hover:text-green-800 hover:underline transition-colors"
                        >
                            {isLogin ? 'Sign up' : 'Login'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
