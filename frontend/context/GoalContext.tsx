'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchUserGoals, UserGoals } from '../utils/goals'

interface GoalContextType {
    goals: UserGoals | null
    loading: boolean
    refreshGoals: () => Promise<void>
}

const GoalContext = createContext<GoalContextType | undefined>(undefined)

export function GoalProvider({ children }: { children: React.ReactNode }) {
    const [goals, setGoals] = useState<UserGoals | null>(null)
    const [loading, setLoading] = useState(true)

    const refreshGoals = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setGoals(null)
                return
            }
            const userGoals = await fetchUserGoals(user.id)
            setGoals(userGoals)
        } catch (error) {
            console.error("Error refreshing goals:", error)
        } finally {
            setLoading(false)
        }
    }

    // Initial Fetch
    useEffect(() => {
        refreshGoals()

        // Optional: Listen for auth changes to clear/fetch goals
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                refreshGoals()
            } else if (event === 'SIGNED_OUT') {
                setGoals(null)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return (
        <GoalContext.Provider value={{ goals, loading, refreshGoals }}>
            {children}
        </GoalContext.Provider>
    )
}

export function useGoals() {
    const context = useContext(GoalContext)
    if (context === undefined) {
        throw new Error('useGoals must be used within a GoalProvider')
    }
    return context
}
