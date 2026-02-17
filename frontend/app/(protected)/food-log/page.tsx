'use client'

import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { supabase } from '@/lib/supabase'
import { getLocalDateString } from '@/utils/date'
import { DailyLog, WaterLog } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoals } from '@/context/GoalContext'
import { calculateProgress } from '@/utils/goals'
import { ListSkeleton, ErrorState } from '@/components/LoadingFallback'

export default function FoodLogPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [foodLogs, setFoodLogs] = useState<DailyLog[]>([])

    // Hydration State
    const [waterLogs, setWaterLogs] = useState<WaterLog[]>([])
    const [waterGoal, setWaterGoal] = useState(2500) // Default 2500 ml
    const [unit, setUnit] = useState<'oz' | 'ml'>('oz')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const formattedDate = getLocalDateString(selectedDate)

    // Derived Hydration Stats
    const CONVERSION_FACTOR = 29.5735
    const totalMl = waterLogs.reduce((sum, log) => sum + log.amount_ml, 0)
    const totalOz = Math.round(totalMl / CONVERSION_FACTOR)

    // Calculate progress using ML for precision
    // waterGoal is now in ml
    const progressPercent = Math.min(calculateProgress(totalMl, waterGoal), 100)

    // Display Values based on Unit
    const displayTotal = unit === 'oz' ? totalOz : totalMl
    const displayGoal = unit === 'oz' ? Math.round(waterGoal / CONVERSION_FACTOR) : waterGoal
    const displayUnit = unit === 'oz' ? 'oz' : 'ml'

    // Prevent logging if more than 1 cup over goal
    // Using 8oz buffer (approx 240ml)
    const isOverLimit = totalMl >= waterGoal + 240

    const [mealType, setMealType] = useState('Breakfast')
    const [submitting, setSubmitting] = useState(false)



    const { goals } = useGoals()

    useEffect(() => {
        if (goals?.water_goal) {
            setWaterGoal(goals.water_goal)
        } else {
            setWaterGoal(2500)
        }
    }, [goals])

    const fetchWaterLogs = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: waterData, error: waterError } = await supabase
                .from('water_logs')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', formattedDate)

            if (waterError) {
                console.error('Error fetching water logs:', waterError)
            } else {
                setWaterLogs(waterData || [])
            }
        } catch (error) {
            console.error('Error fetching water logs:', error)
            // Silent error for water logs to avoid clutter, or could use toast
        }
    }

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch Food Logs
            const { data: foodData, error: foodError } = await supabase
                .from("daily_logs")
                .select("*")
                .eq("user_id", user.id)
                .eq("date", formattedDate)
                .order("logged_at", { ascending: false })

            if (foodError) throw foodError

            console.log("Fetched Logs:", foodData)

            // No transformation needed for snapshot schema (already flat)
            setFoodLogs(foodData as DailyLog[])

            // Fetch Water Logs (now utilizing the separate function if we wanted, 
            // but for specific page load efficiency we can just call the separate function 
            // in parallel or sequentially in useEffect. 
            // For now, let's strictly separate them as per request to have a reusable function.)

        } catch (error) {
            console.error('Error fetching data:', error)
            setError("Unable to load data.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
        fetchWaterLogs()
    }, [formattedDate])

    // State for modal and search
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Search State
    const [foodName, setFoodName] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [searchSource, setSearchSource] = useState<'All' | 'IFCT' | 'USDA'>('All')

    // Debounce Logic
    const [debouncedFoodName, setDebouncedFoodName] = useState(foodName)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFoodName(foodName)
        }, 300)
        return () => clearTimeout(handler)
    }, [foodName])

    // Search Effect
    useEffect(() => {
        const query = debouncedFoodName.trim()
        if (query.length < 2) {
            setSearchResults([])
            setIsSearching(false) // Fix stuck loading state
            return
        }

        // Don't search if the query is exactly what we just selected to avoid re-triggering on selection
        // (Optional optimization: check if query === selectedFood?.name)

        const controller = new AbortController()
        const signal = controller.signal

        const performSearch = async () => {
            setIsSearching(true)
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
                const fetchUrl = `${apiUrl}/search-food?q=${encodeURIComponent(query)}&source=${searchSource}`
                console.log("Searching food:", fetchUrl)

                const res = await fetch(fetchUrl, { signal })

                if (res.ok) {
                    const data = await res.json()
                    const rawResults = data.results || []
                    const uniqueResults: any[] = []
                    const seenNames = new Set()

                    for (const item of rawResults) {
                        const normalized = item.name.toLowerCase().trim()
                        if (!normalized) continue

                        // Robust Deduplication: Check if we've already seen this name
                        if (!seenNames.has(normalized)) {
                            seenNames.add(normalized)
                            uniqueResults.push(item)
                            if (uniqueResults.length >= 50) break
                        }
                    }
                    setSearchResults(uniqueResults)
                } else {
                    console.error("Search failed status:", res.status)
                    setSearchResults([])
                }
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.log('Search aborted')
                } else {
                    console.error("Search failed error:", error)
                    setSearchResults([])
                }
            } finally {
                // Only unset loading if not aborted (otherwise new request is pending)
                if (!signal.aborted) {
                    setIsSearching(false)
                }
            }
        }

        performSearch()

        return () => controller.abort()
    }, [debouncedFoodName, searchSource])

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setFoodName(query)
        if (query.length >= 2) {
            setShowDropdown(true)
        } else {
            setShowDropdown(false)
            setSearchResults([])
        }
    }

    const [selectedFood, setSelectedFood] = useState<any>(null)
    const [quantity, setQuantity] = useState('')
    const [nutritionPreview, setNutritionPreview] = useState<any>(null)

    const selectFood = (food: any) => {
        setFoodName(food.name)
        setSelectedFood(food)
        setShowDropdown(false)
        setNutritionPreview(null) // Reset on new selection
    }

    useEffect(() => {
        if (!selectedFood) {
            setNutritionPreview(null)
            return
        }



        const qtyMatch = quantity.match(/(\d+(\.\d+)?)/)
        const qtyVal = qtyMatch ? parseFloat(qtyMatch[0]) : 0
        const factor = qtyVal / 100

        setNutritionPreview({
            energy_kcal: parseFloat(((selectedFood.energy_kcal || 0) * factor).toFixed(2)),
            protein_g: parseFloat(((selectedFood.protein_g || 0) * factor).toFixed(2)),
            carbs_g: parseFloat(((selectedFood.carbs_g || 0) * factor).toFixed(2)),
            fat_g: parseFloat(((selectedFood.fat_g || 0) * factor).toFixed(2)),
            fiber_g: parseFloat(((selectedFood.fiber_g || 0) * factor).toFixed(2))
        })
    }, [quantity, selectedFood])

    // Close dropdown when clicking outside could be added, but minimal for now

    const handleAddFood = async () => {
        console.log("Add Food Clicked")
        if (!selectedFood || !quantity || !nutritionPreview) return
        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                console.error("No user found")
                return
            }

            console.log("Selected Food:", selectedFood);
            console.log("Quantity:", quantity);
            console.log("Estimated Nutrition:", nutritionPreview);

            const qtyMatch = quantity.match(/(\d+(\.\d+)?)/)
            const quantity_consumed_grams = qtyMatch ? parseFloat(qtyMatch[0]) : 0

            const payload = {
                user_id: user.id,
                date: formattedDate,
                logged_at: new Date().toISOString(),
                food_name: selectedFood.name, // mapped from selectedFood.name
                quantity_consumed_grams: quantity_consumed_grams,
                meal_type: mealType,
                energy_kcal: nutritionPreview.energy_kcal,
                protein_g: nutritionPreview.protein_g,
                carbs_g: nutritionPreview.carbs_g,
                fat_g: nutritionPreview.fat_g,
                fiber_g: nutritionPreview.fiber_g
            }

            console.log("Payload sending to Supabase:", payload)

            const response = await supabase.from('daily_logs').insert([payload])
            console.log("Insert Response:", response)
            const { error } = response

            if (error) {
                console.error("Insert error:", error)
                showToast("Failed to add log ❌")
            } else {
                // Success
                await fetchLogs()
                setIsModalOpen(false)
                // Reset form
                setFoodName('')
                setQuantity('')
                setMealType('Breakfast')
                setSelectedFood(null)
                setNutritionPreview(null)
                setSearchResults([])
                showToast("Food logged successfully! ✅")
            }
        } catch (err) {
            console.error("Add food error:", err)
            showToast("An error occurred ⚠️")
        } finally {
            setSubmitting(false)
        }
    }

    // Toast State
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })

    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast.visible])

    const showToast = (message: string) => {
        setToast({ message, visible: true })
    }

    // Hydration Actions
    const [updatingWater, setUpdatingWater] = useState(false)
    const [showWaterInput, setShowWaterInput] = useState(false)
    const [waterAmount, setWaterAmount] = useState('')

    const handleAddWater = async () => {
        if (isOverLimit) return

        const amount = parseFloat(waterAmount)
        if (!waterAmount || isNaN(amount) || amount <= 0) {
            showToast("Please enter a valid amount ⚠️")
            return
        }

        // Convert to ML if needed
        let amountMl = amount
        if (unit === 'oz') {
            amountMl = amount * 29.5735
        }

        // Validation limits
        if (amountMl > 3000) {
            showToast("Amount too large for one entry (max 3000ml) 🚫")
            return
        }

        setUpdatingWater(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase.from('water_logs').insert({
                user_id: user.id,
                date: formattedDate,
                amount_ml: Math.round(amountMl), // Store as integer ml
                logged_at: new Date().toISOString()
            })

            if (error) {
                console.error("Error logging water:", error)
                showToast("Failed to log water ❌")
            } else {
                await fetchWaterLogs()
                showToast("Water logged! 💧")
                // Cleanup
                setWaterAmount('')
                setShowWaterInput(false)
            }
        } catch (error) {
            console.error("Error in add water:", error)
        } finally {
            setUpdatingWater(false)
        }
    }

    const handleDeleteLog = async (logId: number) => {
        if (!window.confirm("Are you sure you want to remove this entry?")) return

        try {
            const { error } = await supabase
                .from("daily_logs")
                .delete()
                .eq("id", logId)

            if (error) {
                console.error("Error deleting log:", error)
                showToast("Failed to delete log ❌")
                // Revert if needed, but for now we trust the refresh or fetchLogs handles eventual consistency
                fetchLogs()
            } else {
                showToast("Log deleted 🗑️")
                // Optimistic Update: Remove from local state immediately
                setFoodLogs(prev => prev.filter(log => log.id !== logId))
            }
        } catch (error) {
            console.error("Error handling delete:", error)
        }
    }

    const handleQuickAddWater = async () => {
        if (isOverLimit) return
        setUpdatingWater(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase.from('water_logs').insert({
                user_id: user.id,
                date: formattedDate,
                amount_ml: 150,
                logged_at: new Date().toISOString()
            })

            if (error) {
                console.error("Error logging water:", error)
                showToast("Failed to log water ❌")
            } else {
                await fetchWaterLogs()
                showToast("Added 150ml 💧")
            }
        } catch (error) {
            console.error("Error in quick add water:", error)
        } finally {
            setUpdatingWater(false)
        }
    }

    const handleUndoWater = async () => {
        if (waterLogs.length === 0) return
        setUpdatingWater(true)
        try {
            // Find the most recent log for this day to delete
            // waterLogs is already fetched for this day. 
            // Ideally we delete the one with the latest created_at.
            // Let's sort locally to be sure, or rely on API. 
            // Safest is to get the ID from the local sorted list.

            // Sort by logged_at desc
            const sortedLogs = [...waterLogs].sort((a, b) =>
                new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
            )
            const latestLog = sortedLogs[0]

            if (latestLog) {
                const { error } = await supabase
                    .from('water_logs')
                    .delete()
                    .eq('id', latestLog.id)

                if (error) {
                    console.error("Error undoing water log:", error)
                } else {
                    await fetchWaterLogs() // Refresh hydration data
                    showToast("Last entry removed ↩️")
                }
            }
        } catch (error) {
            console.error("Error in undo water:", error)
        } finally {
            setUpdatingWater(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Section with Date Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center justify-between sm:block">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Food Log</h1>
                        <p className="mt-1 text-sm text-gray-500">Track your daily nutrition.</p>
                    </div>

                </div>

                <div className="w-full sm:w-auto flex flex-col sm:items-end gap-3">

                    <div className="relative w-full sm:w-auto">
                        <DatePicker
                            id="date-picker"
                            selected={selectedDate}
                            onChange={(date: Date) => setSelectedDate(date)}
                            maxDate={new Date()}
                            dateFormat="dd/MM/yyyy"
                            onKeyDown={(e) => e.preventDefault()}
                            className="w-full sm:w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer caret-transparent"
                            wrapperClassName="w-full"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-green-600 bg-transparent">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 self-end">Showing logs for: {formattedDate}</p>
                </div>
            </div>

            {/* Hydration Station */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Hydration Tracker</h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">{displayTotal} {displayUnit} / {displayGoal} {displayUnit}</p>
                    </div>

                    {/* Unit Toggle */}
                    <div className="flex bg-gray-100 rounded-full p-1">
                        <button
                            onClick={() => setUnit('oz')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${unit === 'oz' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            oz
                        </button>
                        <button
                            onClick={() => setUnit('ml')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${unit === 'ml' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            ml
                        </button>
                    </div>
                </div>

                {/* Progress Visuals */}
                <div className="mb-6 space-y-3">
                    {/* Progress Bar */}
                    <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Controls & Stats */}
                <div className="flex items-end justify-between">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowWaterInput(!showWaterInput)}
                                disabled={updatingWater || isOverLimit}
                                className={`rounded-lg bg-green-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:scale-95 transition-all ${updatingWater || isOverLimit ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {showWaterInput ? 'Cancel' : 'Log Water'}
                            </button>
                            {unit === 'ml' && (
                                <button
                                    type="button"
                                    onClick={handleQuickAddWater}
                                    disabled={updatingWater || isOverLimit}
                                    className="rounded-lg border border-green-500 px-3 py-2.5 text-sm font-semibold text-green-600 shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    +150 ml
                                </button>
                            )}
                        </div>

                        {showWaterInput && (
                            <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="relative">
                                    <input
                                        type="number"
                                        autoFocus
                                        value={waterAmount}
                                        onChange={(e) => setWaterAmount(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddWater()}
                                        placeholder="Enter amount"
                                        className="w-32 rounded-lg border border-gray-300 py-1.5 pl-3 pr-8 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">{displayUnit}</span>
                                </div>
                                <button
                                    onClick={handleAddWater}
                                    disabled={!waterAmount}
                                    className="rounded-lg bg-green-500 p-2 text-white shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Add Entry"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <button
                            onClick={handleUndoWater}
                            disabled={updatingWater || waterLogs.length === 0}
                            className={`ml-1 text-xs font-medium text-gray-400 decoration-dotted hover:text-red-500 hover:underline transition-colors w-max ${updatingWater || waterLogs.length === 0 ? 'opacity-50 cursor-not-allowed hover:no-underline hover:text-gray-400' : ''}`}
                        >
                            Undo Last Entry
                        </button>
                    </div>

                    <div className="text-right">
                        <p className="mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Today's Intake</p>
                        <div className="flex items-baseline justify-end gap-1.5">
                            <span className="text-3xl font-bold tracking-tight text-gray-900">{displayTotal}</span>
                            <span className="text-sm font-semibold text-gray-500">{displayUnit}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Log Food Button */}
            <div className="mt-6 flex justify-start">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                    Log Food
                </button>
            </div>

            <div>
                {loading ? (
                    <ListSkeleton />
                ) : error ? (
                    <ErrorState message={error} />
                ) : foodLogs.length > 0 ? (
                    <div className="space-y-4">
                        <AnimatePresence mode='popLayout'>
                            {foodLogs.map((log) => (
                                <motion.div
                                    key={log.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow hover:bg-gray-50/50"
                                >
                                    {/* Row 1: Meal Type & Quantity */}
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-lg font-bold uppercase tracking-tight text-gray-800">{log.meal_type || 'Uncategorized'}</h3>
                                        <span className="text-base font-semibold text-gray-900">{log.quantity_consumed_grams}g</span>
                                    </div>

                                    {/* Row 2: Food Name */}
                                    <div className="mb-3">
                                        <p className="text-base font-semibold text-gray-700">{log.food_name}</p>
                                    </div>

                                    {/* Row 3: Nutrition Badges */}
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <span className="bg-green-50 text-green-700 rounded-full px-3 py-1 text-sm font-medium">
                                            {log.energy_kcal.toFixed(1)} kcal
                                        </span>
                                        <span className="bg-green-50 text-green-700 rounded-full px-3 py-1 text-sm font-medium">
                                            {log.protein_g.toFixed(1)}g Protein
                                        </span>
                                        <span className="bg-green-50 text-green-700 rounded-full px-3 py-1 text-sm font-medium">
                                            {log.carbs_g.toFixed(1)}g Carbs
                                        </span>
                                        <span className="bg-green-50 text-green-700 rounded-full px-3 py-1 text-sm font-medium">
                                            {log.fat_g.toFixed(1)}g Fat
                                        </span>
                                        <span className="bg-green-50 text-green-700 rounded-full px-3 py-1 text-sm font-medium">
                                            {log.fiber_g.toFixed(1)}g Fiber
                                        </span>
                                    </div>

                                    {/* Delete Button (Visual Only) */}
                                    <button
                                        className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-red-50 text-red-500 shadow-sm hover:bg-red-100 flex items-center justify-center transition-colors"
                                        title="Delete Log"
                                        onClick={() => handleDeleteLog(log.id)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18"></path>
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="p-12 text-center">
                            <div className="mx-auto h-12 w-12 text-gray-400">
                                <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">No food logs for this date.</h3>
                            <p className="mt-1 text-sm text-gray-500">Start logging your meals to see them here.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Log Food Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between border-b border-green-100 bg-green-50 px-6 py-4">
                            <h2 className="text-lg font-bold text-green-800">Log Food</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-full p-1 text-gray-400 hover:bg-green-100 hover:text-green-600 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="relative">
                                <label htmlFor="foodName" className="block text-sm font-medium text-gray-700">Food Name</label>
                                <input
                                    type="text"
                                    id="foodName"
                                    value={foodName}
                                    onChange={handleSearchChange}
                                    autoComplete="off"
                                    placeholder="Search food..."
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                                />

                                {/* Source Toggle */}
                                <div className="mt-3 flex gap-2">
                                    {(['All', 'IFCT', 'USDA'] as const).map((source) => (
                                        <button
                                            key={source}
                                            onClick={() => setSearchSource(source)}
                                            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${searchSource === source
                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {source}
                                        </button>
                                    ))}
                                </div>

                                {/* Autocomplete Dropdown */}
                                {showDropdown && (searchResults.length > 0 || isSearching) && (
                                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                        {isSearching && searchResults.length === 0 && (
                                            <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-500">
                                                Searching...
                                            </li>
                                        )}
                                        {!isSearching && searchResults.map((food: any, index: number) => (
                                            <li
                                                key={index}
                                                onClick={() => selectFood(food)}
                                                className="relative cursor-pointer select-none py-3 pl-3 pr-4 text-gray-900 hover:bg-green-50 border-b border-gray-50 last:border-0 transition-all bg-white hover:pl-4"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-medium text-sm text-gray-800">{food.name}</span>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ml-2 ${food.source === 'IFCT'
                                                            ? 'bg-teal-100 text-teal-700 border border-teal-200'
                                                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                            }`}>
                                                            {food.source}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="font-semibold text-gray-700">{Math.round(food.energy_kcal || 0)} kcal</span>
                                                        <div className="w-px h-3 bg-gray-200"></div>
                                                        <span className="flex items-center gap-1" title="Protein">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                            {Math.round(food.protein_g || 0)}p
                                                        </span>
                                                        <span className="flex items-center gap-1" title="Carbs">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                                                            {Math.round(food.carbs_g || 0)}c
                                                        </span>
                                                        <span className="flex items-center gap-1" title="Fat">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                                                            {Math.round(food.fat_g || 0)}f
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                                    <input
                                        type="text"
                                        id="quantity"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        // onBlur handled by useEffect
                                        placeholder="e.g. 100g"
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mealType" className="block text-sm font-medium text-gray-700">Meal Category</label>
                                    <select
                                        id="mealType"
                                        value={mealType}
                                        onChange={(e) => setMealType(e.target.value)}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                                    >
                                        <option value="Breakfast">Breakfast</option>
                                        <option value="Lunch">Lunch</option>
                                        <option value="Snack">Snack</option>
                                        <option value="Dinner">Dinner</option>
                                        <option value="Uncategorized">Uncategorized</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                {/* Nutrition Preview */}
                                {nutritionPreview && (
                                    <div className="mb-4 rounded-lg border border-green-100 bg-green-50 p-3">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-green-700">Estimated Nutrition</p>
                                        <div className="flex justify-between text-sm">
                                            <div className="text-center">
                                                <span className="block font-bold text-gray-900">{nutritionPreview.energy_kcal}</span>
                                                <span className="text-xs text-gray-500">kcal</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block font-bold text-gray-900">{nutritionPreview.protein_g}g</span>
                                                <span className="text-xs text-gray-500">Prot</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block font-bold text-gray-900">{nutritionPreview.carbs_g}g</span>
                                                <span className="text-xs text-gray-500">Carbs</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block font-bold text-gray-900">{nutritionPreview.fat_g}g</span>
                                                <span className="text-xs text-gray-500">Fat</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleAddFood}
                                    disabled={submitting}
                                    className="w-full rounded-lg bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                                >
                                    {submitting ? 'Adding...' : 'Add Food'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Toast Notification */}
            <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="bg-gray-900/90 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium backdrop-blur-sm">
                    {toast.message}
                </div>
            </div>
        </div>
    )
}
