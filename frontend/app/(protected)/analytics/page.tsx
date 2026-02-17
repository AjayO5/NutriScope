'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getLocalDateString, getLastNDays } from '@/utils/date'
import { calculateProgress } from '@/utils/goals'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { LoadingSkeleton, ErrorState } from '@/components/LoadingFallback'
import { useGoals } from '@/context/GoalContext'

export default function AnalyticsPage() {
    const [foodLogs, setFoodLogs] = useState<any[]>([])
    const [waterLogs, setWaterLogs] = useState<any[]>([])
    const [selectedNutrient, setSelectedNutrient] = useState('calories')
    const [weeklyData, setWeeklyData] = useState<any[]>([])

    // Use Context
    const { goals: contextGoals } = useGoals()
    const goals = contextGoals || {
        target_calories: 2000,
        target_protein: 75,
        target_carbs: 250,
        target_fat: 70,
        target_fiber: 25,
        water_goal: 2500
    }

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch Data on Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const today = getLocalDateString()
                const sevenDaysAgoDate = new Date()
                sevenDaysAgoDate.setDate(new Date().getDate() - 6)
                const sevenDaysAgo = getLocalDateString(sevenDaysAgoDate)

                // Fetch Logs
                const [foodRes, waterRes] = await Promise.all([
                    supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('date', today),
                    supabase.from('water_logs').select('*').eq('user_id', user.id).eq('date', today)
                ])

                // Fetch Last 7 Days Logs (Food + Water)
                const [weeklyFoodRes, weeklyWaterRes] = await Promise.all([
                    supabase
                        .from('daily_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .gte('date', sevenDaysAgo)
                        .lte('date', today)
                        .order('date', { ascending: true }),
                    supabase
                        .from('water_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .gte('date', sevenDaysAgo)
                        .lte('date', today)
                        .order('date', { ascending: true })
                ])

                const weeklyLogs = weeklyFoodRes.data || []
                const weeklyWaterLogs = weeklyWaterRes.data || []

                setFoodLogs(foodRes.data || [])
                setWaterLogs(waterRes.data || [])

                // Process Weekly Data
                if (weeklyLogs || weeklyWaterLogs) {
                    const groupedData: Record<string, any> = {}

                    // Database Column Mapping
                    const nutrientMap = {
                        calories: "energy_kcal",
                        protein: "protein_g",
                        carbs: "carbs_g",
                        fat: "fat_g",
                        fiber: "fiber_g",
                        water: "amount_ml"
                    }

                    // Initialize last 7 days to ensure continuous data (missing days = 0)
                    const last7Days = getLastNDays(7)

                    last7Days.forEach((date: string) => {
                        groupedData[date] = {
                            date,
                            calories: 0,
                            protein: 0,
                            carbs: 0,
                            fat: 0,
                            fiber: 0,
                            water: 0
                        }
                    })

                    weeklyLogs.forEach((log: any) => {
                        if (groupedData[log.date]) {
                            groupedData[log.date].calories += (log[nutrientMap.calories] || 0)
                            groupedData[log.date].protein += (log[nutrientMap.protein] || 0)
                            groupedData[log.date].carbs += (log[nutrientMap.carbs] || 0)
                            groupedData[log.date].fat += (log[nutrientMap.fat] || 0)
                            groupedData[log.date].fiber += (log[nutrientMap.fiber] || 0)
                        }
                    })

                    weeklyWaterLogs.forEach((log: any) => {
                        if (groupedData[log.date]) {
                            groupedData[log.date].water += (log[nutrientMap.water] || 0)
                        }
                    })

                    const processedWeeklyData = Object.values(groupedData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

                    setWeeklyData(processedWeeklyData)
                    console.log("Weekly Data:", processedWeeklyData)
                }
            } catch (error) {
                console.error('Error fetching analytics:', error)
                setError("Unable to load data.")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const chartData = useMemo(() => {
        if (!weeklyData || weeklyData.length === 0) return []

        // Ensure we match the key in weeklyData (which are lowercase)
        const dataKey = selectedNutrient.toLowerCase()

        return weeklyData.map(day => ({
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            // Ensure numeric value, default to 0
            value: Number(day[dataKey]) || 0
        }))
    }, [selectedNutrient, weeklyData])

    const weeklyAverages = useMemo(() => {
        if (!weeklyData || weeklyData.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 }

        const sums = weeklyData.reduce((acc, curr) => ({
            calories: acc.calories + curr.calories,
            protein: acc.protein + curr.protein,
            carbs: acc.carbs + curr.carbs,
            fat: acc.fat + curr.fat,
            fiber: acc.fiber + curr.fiber,
            water: acc.water + curr.water
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 })

        return {
            calories: Math.round(sums.calories / weeklyData.length),
            protein: Math.round(sums.protein / weeklyData.length),
            carbs: Math.round(sums.carbs / weeklyData.length),
            fat: Math.round(sums.fat / weeklyData.length),
            fiber: Math.round(sums.fiber / weeklyData.length),
            water: Math.round(sums.water / weeklyData.length)
        }
    }, [weeklyData])

    const totals = useMemo(() => {
        const totalCalories = foodLogs.reduce((sum: number, log: any) => sum + (log.energy_kcal || 0), 0)
        const totalProtein = foodLogs.reduce((sum: number, log: any) => sum + (log.protein_g || 0), 0)
        const totalCarbs = foodLogs.reduce((sum: number, log: any) => sum + (log.carbs_g || 0), 0)
        const totalFat = foodLogs.reduce((sum: number, log: any) => sum + (log.fat_g || 0), 0)
        const totalFiber = foodLogs.reduce((sum: number, log: any) => sum + (log.fiber_g || 0), 0)
        const totalWater = waterLogs.reduce((sum: number, log: any) => sum + (log.amount_ml || 0), 0)

        return {
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            fiber: totalFiber,
            water: totalWater
        }
    }, [foodLogs, waterLogs])

    const lastEntryTime = useMemo(() => {
        if (foodLogs.length === 0) return null
        const times = foodLogs.map(log => new Date(log.logged_at || log.created_at).getTime())
        return Math.max(...times)
    }, [foodLogs])

    const calculateWidth = (actual: number, goal: number) => {
        if (!goal) return 0
        const pct = (actual / goal) * 100
        return Math.min(pct, 100)
    }

    const getProgressStyles = (actual: number, goal: number, nutrient: string = '') => {
        if (!goal) return { bg: 'bg-green-500', text: 'text-green-500' }
        const ratio = actual / goal

        // Water Logic
        if (nutrient.toLowerCase() === 'water') {
            if (ratio >= 1.0) return { bg: 'bg-blue-500', text: 'text-blue-500' }
            if (ratio >= 0.7) return { bg: 'bg-sky-400', text: 'text-sky-400' }
            return { bg: 'bg-red-500', text: 'text-red-500' }
        }

        if (ratio < 0.6) return { bg: 'bg-red-500', text: 'text-red-500' }
        if (ratio < 0.95) return { bg: 'bg-orange-500', text: 'text-orange-500' }
        if (ratio <= 1.1) return { bg: 'bg-green-500', text: 'text-green-500' }
        if (ratio <= 1.25) return { bg: 'bg-orange-500', text: 'text-orange-500' }
        return { bg: 'bg-red-500', text: 'text-red-500' }
    }

    const getTimeAwareProgressStyles = (actual: number, goal: number) => {
        if (!goal) return { bg: 'bg-green-500', text: 'text-green-500' }

        const ratio = actual / goal

        // 1. Overeating Logic
        // > 1.25 is where we start considering it "Over" (Red)
        if (ratio > 1.25) return { bg: 'bg-red-500', text: 'text-red-500' }

        const currentHour = new Date().getHours()
        let expectedRatio = 0

        // Define expected progress curve based on time
        if (currentHour < 10) expectedRatio = 0.15
        else if (currentHour < 14) expectedRatio = 0.35 // 10AM - 2PM
        else if (currentHour < 18) expectedRatio = 0.60 // 2PM - 6PM
        else if (currentHour < 21) expectedRatio = 0.80 // 6PM - 9PM
        else expectedRatio = 0.95 // After 9PM

        const isBehind = ratio < expectedRatio

        if (isBehind) {
            // Pacing Logic: Only show red if stalled or severe late deficit
            const now = Date.now()
            // If no logs, treat as infinite time since last entry
            const hoursSinceEntry = lastEntryTime ? (now - lastEntryTime) / (1000 * 60 * 60) : 999

            const isStalled = hoursSinceEntry > 3
            const isSevereLate = currentHour >= 20 && ratio < 0.7

            if (isStalled || isSevereLate) {
                return { bg: 'bg-red-500', text: 'text-red-500' }
            }
            // Otherwise, user is actively progressing -> Green
        }

        // On Track or Active Pacing
        return { bg: 'bg-green-500', text: 'text-green-500' }
    }

    const renderNutrientCard = (title: string, actual: number, goal: number, unit: string) => {
        const styles = getTimeAwareProgressStyles(actual, goal)
        const percentage = calculateProgress(actual, goal)
        const currentHour = new Date().getHours()
        const ratio = goal ? actual / goal : 0

        let warningBadge = null
        if (ratio > 1.40) {
            warningBadge = (
                <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md bg-red-100 text-red-800 text-xs font-bold border border-red-200">
                    Excess intake — adjust next meal
                </div>
            )
        } else if (ratio > 1.25) {
            warningBadge = (
                <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                    Significantly over target
                </div>
            )
        }

        return (
            <div className="rounded-2xl shadow-lg p-6 bg-white border border-gray-100/50 hover:shadow-xl transition-shadow duration-300 flex flex-col h-full justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2 mt-1">
                        <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
                        <span className={`text-sm font-bold ${styles.text}`}>{percentage}%</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-3xl font-bold text-gray-900 tracking-tight">{Math.round(actual)}</span>
                        <span className="text-sm font-medium text-gray-500">{unit}</span>
                    </div>
                    <div className="text-sm text-gray-400 mb-4 font-medium">Goal: {goal} {unit}</div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${styles.bg}`} style={{ width: `${calculateWidth(actual, goal)}%` }}></div>
                    </div>
                </div>
                {warningBadge}
            </div>
        )
    }

    const renderSummaryCard = (title: string, avg: number, goal: number, unit: string) => {
        const styles = getProgressStyles(avg, goal, title)
        const percentage = calculateProgress(avg, goal)
        const ratio = goal ? avg / goal : 0

        const showWarning = ratio > 1.25 || ratio < 0.5

        return (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-1">
                    <div className="text-xs text-gray-500 font-medium">Avg {title}</div>
                    {showWarning && (
                        <div className="text-orange-500" title="Warning: Extreme value">⚠️</div>
                    )}
                </div>
                <div className="flex items-baseline gap-2">
                    <div className="text-lg font-bold text-gray-900">{avg} <span className="text-xs font-normal text-gray-500">{unit}</span></div>
                    <div className={`text-xs font-bold ${styles.text}`}>{percentage}%</div>
                </div>
                <div className={`h-1.5 w-full bg-gray-100 rounded-full mt-2 overflow-hidden`}>
                    <div className={`h-full rounded-full ${styles.bg}`} style={{ width: `${calculateWidth(avg, goal)}%` }}></div>
                </div>
            </div>
        )
    }


    const currentGoal = useMemo(() => {
        switch (selectedNutrient) {
            case 'calories': return goals.target_calories
            case 'protein': return goals.target_protein
            case 'carbs': return goals.target_carbs
            case 'fat': return goals.target_fat
            case 'fiber': return goals.target_fiber
            case 'water': return goals.water_goal
            default: return 0
        }
    }, [selectedNutrient, goals])

    const behaviorMetrics = useMemo(() => {
        if (!chartData || chartData.length === 0 || !currentGoal) return { streak: 0, last3Avg: 0 }

        // Last 3 Days Average (calculate from chartData which has values)
        const last3 = chartData.slice(-3)
        const last3Sum = last3.reduce((acc, curr) => acc + curr.value, 0)
        const last3Avg = last3Sum / last3.length

        // Streak Calculation (Consecutive days goal met)
        // We define "met" as reaching at least 100% of goal
        let streak = 0
        for (let i = chartData.length - 1; i >= 0; i--) {
            if (chartData[i].value >= currentGoal) {
                streak++
            } else {
                break
            }
        }

        return { streak, last3Avg }
    }, [chartData, currentGoal])

    const currentAverage = useMemo(() => {
        // @ts-ignore
        return weeklyAverages[selectedNutrient] || 0
    }, [weeklyAverages, selectedNutrient])

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (error) return <ErrorState message={error} />

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Analytics</h1>

            <section>
                <h2 className="text-xl font-semibold mb-4">Daily Progress</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {renderNutrientCard('Calories', totals.calories, goals.target_calories, 'kcal')}
                    {renderNutrientCard('Protein', totals.protein, goals.target_protein, 'g')}
                    {renderNutrientCard('Carbs', totals.carbs, goals.target_carbs, 'g')}
                    {renderNutrientCard('Fat', totals.fat, goals.target_fat, 'g')}
                    {renderNutrientCard('Fiber', totals.fiber, goals.target_fiber, 'g')}
                </div>
            </section>

            <section className="mt-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Weekly Trends</h2>
                    <div className="flex items-center gap-3">
                        <label htmlFor="nutrient-select" className="text-sm font-medium text-gray-600">Nutrient:</label>
                        <select
                            id="nutrient-select"
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5 shadow-sm"
                            value={selectedNutrient}
                            onChange={(e) => setSelectedNutrient(e.target.value)}
                        >
                            <option value="calories">Calories</option>
                            <option value="protein">Protein</option>
                            <option value="carbs">Carbs</option>
                            <option value="fat">Fat</option>
                            <option value="fiber">Fiber</option>
                            <option value="water">Water</option>
                        </select>
                    </div>
                </div>





                {/* Chart */}
                <div className="w-full h-[300px] bg-white border border-gray-200 rounded-xl shadow-sm mb-8 pt-4 pr-6 pb-2">
                    {!chartData || chartData.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-gray-400 font-medium">No data available</p>
                        </div>
                    ) : (
                        <div className="h-64 sm:h-80 w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            hide
                                        />
                                        <Tooltip
                                            cursor={{ stroke: '#3B82F6', strokeWidth: 2 }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {payload[0].value} {selectedNutrient === 'calories' ? 'kcal' : 'g'}
                                                            </p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#3B82F6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                            dot={{ r: 4, fill: '#fff', stroke: '#3B82F6', strokeWidth: 2 }}
                                            activeDot={{ r: 6, fill: '#fff', stroke: '#3B82F6', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                                    <svg className="h-12 w-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                    </svg>
                                    <p className="text-sm font-medium">No data available</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {renderSummaryCard('Calories', weeklyAverages.calories, goals.target_calories, 'kcal')}
                    {renderSummaryCard('Protein', weeklyAverages.protein, goals.target_protein, 'g')}
                    {renderSummaryCard('Carbs', weeklyAverages.carbs, goals.target_carbs, 'g')}
                    {renderSummaryCard('Fat', weeklyAverages.fat, goals.target_fat, 'g')}
                    {renderSummaryCard('Fiber', weeklyAverages.fiber, goals.target_fiber, 'g')}
                </div>
            </section>
        </div>
    );
}
