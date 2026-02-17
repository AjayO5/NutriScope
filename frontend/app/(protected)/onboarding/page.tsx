'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useGoals } from '@/context/GoalContext'

export default function OnboardingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        height: '',
        weight: '',
        age: '',
        gender: '',
        activityLevel: 'Moderate',
        goalType: 'maintain'
    })
    const { refreshGoals } = useGoals()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            // Check if profile exists
            // Check if profile exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle()

            if (!profile) {
                await supabase.from('profiles').insert({
                    id: session.user.id
                })
            } else if (profile.onboarding_completed) {
                router.push('/')
            }
        }
        checkUser()
    }, [router])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Calculations
            const heightVal = parseFloat(formData.height)
            const weightVal = parseFloat(formData.weight)
            const ageVal = parseInt(formData.age)
            const genderVal = formData.gender

            // Activity Multiplier
            const activityMap: Record<string, number> = {
                'Sedentary': 1.2,
                'Light': 1.375,
                'Moderate': 1.55,
                'Active': 1.725,
                'Very Active': 1.9
            }
            const actMultiplier = activityMap[formData.activityLevel] || 1.2

            // BMR (Mifflin-St Jeor)
            let bmr = (10 * weightVal) + (6.25 * heightVal) - (5 * ageVal)
            if (genderVal === 'male') bmr += 5
            else bmr -= 161

            // TDEE
            let tdee = Math.round(bmr * actMultiplier)

            // Goal Adjustment
            if (formData.goalType === 'lose') tdee -= 500
            if (formData.goalType === 'gain') tdee += 500

            // Macros
            // Protein: 1.6g/kg
            const protein = Math.round(weightVal * 1.6)
            // Fat: 0.8g/kg
            const fat = Math.round(weightVal * 0.8)
            // Carbs: Remaining
            // (calories - (protein*4 + fat*9)) / 4
            const carbCals = tdee - ((protein * 4) + (fat * 9))
            const carbs = Math.max(0, Math.round(carbCals / 4))

            // Fiber: Fixed 30
            const fiber = 30

            // Water: 35ml/kg
            const water = Math.round(weightVal * 35)

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    username: user.email?.split('@')[0] || '',
                    height_cm: heightVal,
                    weight_kg: weightVal,
                    age: ageVal,
                    gender: genderVal.charAt(0).toUpperCase() + genderVal.slice(1), // 'Male'/'Female'
                    activity_level: formData.activityLevel, // Save text value
                    goal: formData.goalType, // Use correct column name 'goal'
                    bmr: bmr,
                    tdee: tdee,
                    target_calories: tdee,
                    target_protein: protein,
                    target_carbs: carbs,
                    target_fat: fat,
                    target_fiber: fiber,
                    water_goal: water,
                    onboarding_completed: true
                }, { onConflict: 'id' })

            if (error) throw error

            await refreshGoals()
            router.push('/')
        } catch (error) {
            console.error('Error saving profile:', error)
            alert('Failed to save profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleSkip = () => {
        router.push('/')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome to NutriScope!</h1>
                    <p className="mt-2 text-gray-600">Let's personalize your health journey</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="height" className="block text-sm font-medium text-gray-700">Height (cm)</label>
                            <input
                                type="number"
                                name="height"
                                id="height"
                                value={formData.height}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                                placeholder="170"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                            <input
                                type="number"
                                name="weight"
                                id="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                                placeholder="70"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                        <input
                            type="number"
                            name="age"
                            id="age"
                            value={formData.age}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                            placeholder="25"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                        <select
                            id="gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                            required
                        >
                            <option value="" disabled>Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="activityLevel" className="block text-sm font-medium text-gray-700">Activity Level</label>
                        <select
                            id="activityLevel"
                            name="activityLevel"
                            value={formData.activityLevel}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                        >
                            <option value="Sedentary">Sedentary</option>
                            <option value="Light">Light</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Active">Active</option>
                            <option value="Very Active">Very Active</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="goalType" className="block text-sm font-medium text-gray-700">Goal</label>
                        <select
                            id="goalType"
                            name="goalType"
                            value={formData.goalType}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                        >
                            <option value="maintain">Maintain Weight</option>
                            <option value="lose">Lose Weight</option>
                            <option value="gain">Gain Muscle</option>
                        </select>
                    </div>

                    <div className="flex space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                            Skip
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Continue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
