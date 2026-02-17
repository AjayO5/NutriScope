'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingSkeleton } from './LoadingFallback'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            // Public routes that don't require auth
            const isPublic = pathname.startsWith('/login') || pathname.startsWith('/onboarding') || pathname.startsWith('/auth')

            if (session) {
                // User is logged in
                setIsAuthenticated(true)
            } else if (isPublic) {
                // User is not logged in but on public route
                setIsAuthenticated(true)
            } else {
                // User is not logged in and on protected route - redirect
                router.replace('/login')
                return
            }

            setIsLoading(false)
        }

        checkAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false)
                router.replace('/login')
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [pathname, router])

    // If loading, show nothing or spinner. 
    // We only render children if authenticated or on public route.
    if (isLoading) {
        // While checking auth, we can verify if it's very likely a protected route and show spinner
        // But for smoother UX, might just return null or a full screen loader
        return null // or <div className="h-screen flex items-center justify-center"><LoadingSkeleton /></div>
    }

    // Only render children if authenticated (or public)
    // Extra safety check in render
    if (!isAuthenticated) {
        return null
    }

    return <>{children}</>
}
