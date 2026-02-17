'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import type { Profile, AlertResponse } from '../../types'

export default function Dashboard() {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    const [waterIntake, setWaterIntake] = useState(0)
    const [alerts, setAlerts] = useState<string[]>([])
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const getUserAndProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserEmail(user.email ?? 'User')

                // Fetch profile
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileData) {
                    setProfile(profileData as Profile)
                }

                // Fetch today's water logs
                const startOfDay = new Date(selectedDate)
                startOfDay.setHours(0, 0, 0, 0)

                const endOfDay = new Date(selectedDate)
                endOfDay.setHours(23, 59, 59, 999)

                const { data: waterLogs } = await supabase
                    .from('water_logs')
                    .select('amount')
                    .eq('user_id', user.id)
                    .gte('created_at', startOfDay.toISOString())
                    .lte('created_at', endOfDay.toISOString())

                let currentWater = 0
                if (waterLogs) {
                    currentWater = waterLogs.reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0)
                    setWaterIntake(currentWater)
                } else {
                    setWaterIntake(0)
                }

                // Call backend for alerts
                try {
                    const res = await fetch('http://127.0.0.1:8000/alerts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            current_time: new Date().toISOString(),
                            protein_intake: 0, // Placeholder
                            protein_goal: profileData?.protein_goal || 150, // Default or fetched
                            water_intake: currentWater,
                            water_goal: profileData?.water_goal || 2000
                        })
                    })

                    if (res.ok) {
                        const data: AlertResponse = await res.json()
                        setAlerts(data.alerts)
                    }
                } catch (err) {
                    console.error("Failed to fetch alerts", err)
                }
            } else {
                router.push('/auth')
            }
            setLoading(false)
        }

        getUserAndProfile()
    }, [router, selectedDate])

    const addWater = async (amount: number) => {
        // Only allow adding water if selected date is today
        const today = new Date()
        if (selectedDate.toDateString() !== today.toDateString()) {
            alert("You can only log water for today.")
            return
        }

        // Optimistic update
        setWaterIntake(prev => prev + amount)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('water_logs').insert({
            user_id: user.id,
            amount: amount
        })

        if (error) {
            console.error('Error adding water:', error)
            // Revert on error
            setWaterIntake(prev => prev - amount)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Welcome back, {userEmail}
                    </h2>
                    {profile && (
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                            <span>Height: {profile.height} cm</span>
                            <span>•</span>
                            <span>Weight: {profile.weight} kg</span>
                            <span>•</span>
                            <span>Water Goal: {profile.water_goal} ml</span>
                        </div>
                    )}
                </div>
                <div>
                    {mounted && (
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date: Date | null) => {
                                if (date) setSelectedDate(date)
                            }}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            dateFormat="MMMM d, yyyy"
                        />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900">AI Nutrient Coach</h3>
                    <div className="mt-4 min-h-[8rem] rounded-md border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-500 p-4">
                        {alerts.length > 0 ? (
                            <ul className="list-disc text-left space-y-2">
                                {alerts.map((alert, idx) => (
                                    <li key={idx} className="text-red-500 font-medium">{alert}</li>
                                ))}
                            </ul>
                        ) : (
                            <span className="text-green-600 font-medium">You're on track today!</span>
                        )}
                    </div>
                </div>

                {/* Calories Progress */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="text-lg font-medium text-gray-900">Calories</h3>
                    <div className="mt-4 h-48 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                        Calorie Progress Chart Placeholder
                    </div>
                </div>

                {/* Hydration Section */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Hydration</h3>
                        <span className="text-2xl font-bold text-blue-600">{waterIntake} ml</span>
                    </div>
                    <div className="mt-4 flex flex-col items-center justify-center space-y-4">
                        {/* Simple visual bar could go here, for now just buttons as requested */}
                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${Math.min((waterIntake / (profile?.water_goal || 2000)) * 100, 100)}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3 w-full">
                            <button
                                onClick={() => addWater(250)}
                                className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                            >
                                +250ml
                            </button>
                            <button
                                onClick={() => addWater(500)}
                                className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                            >
                                +500ml
                            </button>
                            <button
                                onClick={() => addWater(1000)}
                                className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                            >
                                +1L
                            </button>
                        </div>
                    </div>
                </div>

                {/* Macro Breakdown */}
                <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900">Macro Breakdown</h3>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="h-24 rounded bg-red-50 border border-red-100 flex flex-col items-center justify-center">
                            <span className="font-semibold text-red-600">Protein</span>
                            <span className="text-xs text-gray-500">Placeholder</span>
                        </div>
                        <div className="h-24 rounded bg-yellow-50 border border-yellow-100 flex flex-col items-center justify-center">
                            <span className="font-semibold text-yellow-600">Carbs</span>
                            <span className="text-xs text-gray-500">Placeholder</span>
                        </div>
                        <div className="h-24 rounded bg-orange-50 border border-orange-100 flex flex-col items-center justify-center">
                            <span className="font-semibold text-orange-600">Fats</span>
                            <span className="text-xs text-gray-500">Placeholder</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
