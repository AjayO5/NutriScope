'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getLocalDateString } from '@/utils/date'
import { ArrowRightIcon, PlusIcon } from '@heroicons/react/24/solid'
import { calculateProgress } from '@/utils/goals'
import { useGoals } from '@/context/GoalContext'
import { LoadingSkeleton, ErrorState } from '@/components/LoadingFallback'
import { HomeProgressRing } from '@/components/HomeProgressRing'

export default function HomePage() {
    const [foodLogs, setFoodLogs] = useState<any[]>([])
    const [waterLogs, setWaterLogs] = useState<any[]>([])
    const { goals } = useGoals()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const today = getLocalDateString()

                const [foodRes, waterRes] = await Promise.all([
                    supabase
                        .from('daily_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('date', today),
                    supabase
                        .from('water_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('date', today)
                ])

                if (foodRes.error) console.error('Error fetching food logs:', foodRes.error)
                if (waterRes.error) console.error('Error fetching water logs:', waterRes.error)

                const newFoodLogs = foodRes.data || []
                const newWaterLogs = waterRes.data || []

                setFoodLogs(newFoodLogs)
                setWaterLogs(newWaterLogs)

                setFoodLogs(newFoodLogs)
                setWaterLogs(newWaterLogs)

            } catch (error) {
                console.error('Error in fetchData:', error)
                setError("Unable to load data.")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const totals = useMemo(() => { // Removed import, so need to check if useMemo is imported? It is not in Home page imports yet.
        const totalCalories = foodLogs.reduce((sum, log) => sum + (log.energy_kcal || 0), 0)
        const totalProtein = foodLogs.reduce((sum, log) => sum + (log.protein_g || 0), 0)
        const totalCarbs = foodLogs.reduce((sum, log) => sum + (log.carbs_g || 0), 0)
        const totalFat = foodLogs.reduce((sum, log) => sum + (log.fat_g || 0), 0)
        const totalFiber = foodLogs.reduce((sum, log) => sum + (log.fiber_g || 0), 0)
        const totalWater = waterLogs.reduce((sum, log) => sum + (log.amount_ml || 0), 0)

        return {
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            fiber: totalFiber,
            water: totalWater
        }
    }, [foodLogs, waterLogs])

    if (loading) return <div className="p-6"><LoadingSkeleton /></div>
    if (error) return <ErrorState message={error} />

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Welcome back to your health journey.</p>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Row 1: Daily Snapshot (2/3) & Recent Entries (1/3) */}

                {/* Daily Snapshot */}
                <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-base font-semibold text-gray-900">Daily Snapshot</h2>
                        <span className="text-sm text-green-600 font-medium">Today</span>
                    </div>

                    {/* Snapshot Content - Rings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <HomeProgressRing
                            label="Calories"
                            current={totals.calories}
                            goal={goals?.target_calories || 2000}
                            unit="kcal"
                            color="green"
                        />
                        <HomeProgressRing
                            label="Protein"
                            current={totals.protein}
                            goal={goals?.target_protein || 150}
                            unit="g"
                            color="blue"
                        />
                        <HomeProgressRing
                            label="Water"
                            current={totals.water}
                            goal={goals?.water_goal || 2500}
                            unit="ml"
                            color="sky"
                        />
                    </div>
                </div>

                {/* Recent Entries */}
                <div className="lg:col-span-1 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Entries</h2>

                    {/* Recent Entries List */}
                    <div className="space-y-4">
                        {[...foodLogs]
                            .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
                            .slice(0, 3)
                            .map((log) => (
                                <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-medium uppercase">
                                        {log.meal_type ? log.meal_type.slice(0, 2) : 'FD'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-gray-900 truncate">{log.food_name}</div>
                                        <div className="text-xs text-gray-500">
                                            {Math.round(log.energy_kcal)} kcal • {log.quantity_consumed_grams}g
                                        </div>
                                    </div>
                                </div>
                            ))}
                        {foodLogs.length === 0 && (
                            <div className="text-center py-6 text-sm text-gray-500">
                                No entries today.
                            </div>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                        <a href="/food-log" className="text-sm font-medium text-green-600 hover:text-green-700">View All Log</a>
                    </div>
                </div>

            </div>

            {/* Row 2: AI Coach (Full width) */}
            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">AI Coach</h2>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Beta
                    </span>
                </div>

                {/* Dynamic Alerts */}
                <div className="flex flex-col gap-3">
                    {(() => {
                        const calorieGoal = goals?.target_calories || 2000
                        const proteinGoal = goals?.target_protein || 75
                        const waterGoal = goals?.water_goal || 2500

                        // Step 1: Get Current Time & Phase
                        const currentHour = new Date().getHours()
                        let dayPhase = "morning"
                        if (currentHour >= 11 && currentHour < 17) {
                            dayPhase = "afternoon"
                        } else if (currentHour >= 17) {
                            dayPhase = "evening"
                        }

                        // Step 2: Calculate Percentages
                        const caloriePercent = calculateProgress(totals.calories, calorieGoal)
                        const proteinPercent = calculateProgress(totals.protein, proteinGoal)
                        const waterPercent = calculateProgress(totals.water, waterGoal)

                        const alerts: { type: string, message: string, tip: string }[] = []

                        // ---- CALORIES ----
                        if (dayPhase === "evening" && caloriePercent < 60) {
                            alerts.push({
                                type: "critical",
                                message: "Your calorie intake is too low for this time of day.",
                                tip: "Consider a balanced dinner with protein and complex carbs."
                            })
                        }

                        if (caloriePercent > 100) {
                            alerts.push({
                                type: "warning",
                                message: "You have exceeded your calorie goal.",
                                tip: "Focus on lighter meals for the rest of the day."
                            })
                        }

                        // ---- PROTEIN ----
                        if (dayPhase === "evening" && proteinPercent < 60) {
                            alerts.push({
                                type: "critical",
                                message: "Your protein intake is too low.",
                                tip: "Add eggs, paneer, chicken, tofu, or lentils."
                            })
                        }

                        if (dayPhase === "afternoon" && proteinPercent < 40) {
                            alerts.push({
                                type: "warning",
                                message: "You're slightly behind on protein.",
                                tip: "Add a protein-rich snack."
                            })
                        }

                        // ---- WATER ----
                        if (waterPercent < 50 && dayPhase !== "morning") {
                            alerts.push({
                                type: "warning",
                                message: "You are behind on hydration.",
                                tip: "Drink 1-2 glasses of water now."
                            })
                        }

                        if (waterPercent < 30 && dayPhase === "evening") {
                            alerts.push({
                                type: "critical",
                                message: "Severely dehydrated for this time of day.",
                                tip: "Hydrate immediately."
                            })
                        }

                        // Success Message (if no warnings)
                        if (alerts.length === 0) {
                            alerts.push({
                                type: "success",
                                message: "You're on track today!",
                                tip: "Keep maintaining this balance."
                            })
                        }

                        return alerts.map((alert, index) => {
                            let styles = ""
                            let icon = ""

                            switch (alert.type) {
                                case 'critical':
                                    styles = "bg-red-50 border-red-100 text-red-800"
                                    icon = "🚨"
                                    break;
                                case 'warning':
                                    styles = "bg-yellow-50 border-yellow-100 text-yellow-800"
                                    icon = "⚠️"
                                    break;
                                case 'success':
                                    styles = "bg-green-50 border-green-100 text-green-800"
                                    icon = "✅"
                                    break;
                                default:
                                    styles = "bg-blue-50 border-blue-100 text-blue-800"
                                    icon = "ℹ️"
                            }

                            return (
                                <div key={index} className={`rounded-lg p-4 border flex gap-3 text-sm ${styles}`}>
                                    <span className="text-xl">{icon}</span>
                                    <div>
                                        <span className="font-semibold block">{alert.message}</span>
                                        {alert.tip}
                                    </div>
                                </div>
                            )
                        })
                    })()}
                </div>
            </div>
        </div>
    )
}
