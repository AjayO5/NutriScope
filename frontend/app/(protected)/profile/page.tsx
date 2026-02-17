'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

import { useGoals } from '@/context/GoalContext'
import { FormSkeleton, ErrorState } from '@/components/LoadingFallback'

export default function ProfilePage() {
    const { refreshGoals } = useGoals()
    const [activeTab, setActiveTab] = useState<'details' | 'goals'>('details')
    const [loading, setLoading] = useState(true)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)
    const [profile, setProfile] = useState<any>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true)

                // 1. Get Current User
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    setError("No user logged in")
                    setLoading(false)
                    return
                }

                // 2. Fetch Profile
                let { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle()

                if (error) {
                    console.error("Error fetching profile:", error)
                    setError("Unable to load data.")
                } else if (!data) {
                    // 3. Auto-create if no profile exists
                    console.log("No profile found, creating default...")
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id, // Primary key matches auth.uid
                            username: "",
                            height: null,
                            weight: null,
                            age: null,
                            gender: "",
                            activity_level: "1.55", // default moderate
                            goal_type: "maintain",
                            target_calories: 2000,
                            target_protein: 75,
                            target_carbs: 250,
                            target_fat: 70,
                            target_fiber: 25,
                            water_goal: 2500
                        })

                    if (insertError) {
                        console.error("Error creating default profile:", insertError)
                        setError("Unable to load data.")
                    } else {
                        // Refetch immediately
                        const { data: newData, error: newError } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', user.id)
                            .maybeSingle()

                        if (newError || !newData) {
                            setError("Unable to load data.")
                        } else {
                            setProfile(newData)
                        }
                    }
                } else {
                    setProfile(data)
                }
            } catch (err: any) {
                console.error("Unexpected error:", err)
                setError("Unable to load data.")
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [])

    const handleInputChange = (field: string, value: any) => {
        if (profile) {
            setProfile({ ...profile, [field]: value })
            // Reset save status on edit so success message disappears
            if (saveStatus !== 'idle') setSaveStatus('idle')
        }
    }

    const handleSaveGeneric = async (updateData: any) => {
        if (!profile) return

        setSaveStatus('saving')
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError("No user logged in")
                setSaveStatus('error')
                return
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id)

            if (updateError) {
                console.error("Error updating profile:", updateError)
                setSaveStatus('error')
            } else {
                setSaveStatus('success')
                // Optional: clear success message after 3s
                setTimeout(() => setSaveStatus('idle'), 3000)
            }
        } catch (err: any) {
            console.error("Unexpected error saving profile:", err)
            setSaveStatus('error')
        }
    }

    const handleSave = async () => {
        handleSaveGeneric({
            username: profile.username,
            age: profile.age,
            gender: profile.gender,
            height_cm: profile.height_cm || profile.height,
            weight_kg: profile.weight_kg || profile.weight,
            activity_level: profile.activity_level,
            goal: profile.goal || profile.goal_type
        })
    }

    const handleSaveGoals = async () => {
        await handleSaveGeneric({
            target_calories: profile.target_calories,
            target_protein: profile.target_protein,
            target_carbs: profile.target_carbs,
            target_fat: profile.target_fat,
            target_fiber: profile.target_fiber,
            water_goal: profile.water_goal
        })
        await refreshGoals()
    }

    const handleResetGoals = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1️⃣ Fetch profile
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (error || !profile) {
            console.error(error)
            return
        }

        // 2️⃣ Recalculate BMR and TDEE
        const activityMap: Record<string, number> = {
            'Sedentary': 1.2,
            'Light': 1.375,
            'Moderate': 1.55,
            'Active': 1.725,
            'Very Active': 1.9
        }
        const multiplier = activityMap[profile.activity_level] || 1.2
        const weight = profile.weight_kg;
        const height = profile.height_cm;
        const age = profile.age;
        const gender = profile.gender;

        let bmr = 0;
        if (gender === 'Male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
        }

        const tdee = Math.round(bmr * multiplier)

        const calories = tdee;
        const protein = Math.round(weight * 1.6);
        const fat = Math.round(weight * 0.8);
        const fiber = 30;

        const carbs = Math.round(
            (calories - ((protein * 4) + (fat * 9))) / 4
        );

        const water = Math.round(weight * 35);

        // 3️⃣ Update Supabase using EXACT column names
        await supabase
            .from("profiles")
            .update({
                bmr: bmr,
                tdee: tdee,
                target_calories: calories,
                target_protein: protein,
                target_carbs: carbs,
                target_fat: fat,
                target_fiber: fiber,
                water_goal: water
            })
            .eq("id", user.id);

        // 4️⃣ After update: Update local state
        const newGoals = {
            ...profile,
            target_calories: calories,
            target_protein: protein,
            target_carbs: carbs,
            target_fat: fat,
            target_fiber: fiber,
            water_goal: water
        }

        setProfile(newGoals)
        await refreshGoals()
    }

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
                <FormSkeleton />
            </div>
        )
    }

    if (error && !profile) {
        return <ErrorState message={error} />
    }

    // Default empty if profile is null (shouldn't happen if error handled, but safe fallback)
    const p = profile || {}

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Personal Details
                </button>
                <button
                    onClick={() => setActiveTab('goals')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'goals'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Goals
                </button>
            </div>

            {/* Content */}
            {activeTab === 'details' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Username */}
                        <div className="col-span-2">
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                            <input
                                type="text"
                                id="username"
                                value={p.username || ''}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                placeholder="Enter your username"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Age */}
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                            <input
                                type="number"
                                id="age"
                                value={p.age || ''}
                                onChange={(e) => handleInputChange('age', e.target.value)}
                                placeholder="e.g. 25"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Gender */}
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                            <select
                                id="gender"
                                value={p.gender || ''}
                                onChange={(e) => handleInputChange('gender', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border bg-white"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Height */}
                        <div>
                            <label htmlFor="height" className="block text-sm font-medium text-gray-700">Height (cm)</label>
                            <input
                                type="number"
                                id="height"
                                value={p.height || ''}
                                onChange={(e) => handleInputChange('height', e.target.value)}
                                placeholder="e.g. 175"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Weight */}
                        <div>
                            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                            <input
                                type="number"
                                id="weight"
                                value={p.weight || ''}
                                onChange={(e) => handleInputChange('weight', e.target.value)}
                                placeholder="e.g. 70"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Activity Level */}
                        <div>
                            <label htmlFor="activity_level" className="block text-sm font-medium text-gray-700">Activity Level</label>
                            <select
                                id="activity_level"
                                value={p.activity_level || ''}
                                onChange={(e) => handleInputChange('activity_level', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border bg-white"
                            >
                                <option value="1.2">Sedentary (Office job)</option>
                                <option value="1.375">Lightly Active (1-3 days/week)</option>
                                <option value="1.55">Moderately Active (3-5 days/week)</option>
                                <option value="1.725">Very Active (6-7 days/week)</option>
                                <option value="1.9">Super Active (Physical job)</option>
                            </select>
                        </div>

                        {/* Goal Type */}
                        <div>
                            <label htmlFor="goal_type" className="block text-sm font-medium text-gray-700">Goal Type</label>
                            <select
                                id="goal_type"
                                value={p.goal_type || ''}
                                onChange={(e) => handleInputChange('goal_type', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border bg-white"
                            >
                                <option value="maintain">Maintain Weight</option>
                                <option value="lose">Lose Weight</option>
                                <option value="gain">Gain Muscle</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        {saveStatus === 'success' && (
                            <span className="text-sm text-green-600 font-medium animate-fade-in">
                                Profile updated successfully
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-sm text-red-600 font-medium animate-fade-in">
                                Failed to update profile
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className={`px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${saveStatus === 'saving'
                                ? 'bg-green-400 text-white cursor-wait'
                                : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Nutritional Goals</h2>
                        <button
                            onClick={handleResetGoals}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                        >
                            Reset to Calculated Goals
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Calories */}
                        <div>
                            <label htmlFor="target_calories" className="block text-sm font-medium text-gray-700">Daily Calories (kcal)</label>
                            <input
                                type="number"
                                id="target_calories"
                                value={p.target_calories || ''}
                                onChange={(e) => handleInputChange('target_calories', e.target.value)}
                                placeholder="e.g. 2000"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Water */}
                        <div>
                            <label htmlFor="water_goal" className="block text-sm font-medium text-gray-700">Water Goal (ml)</label>
                            <input
                                type="number"
                                id="water_goal"
                                value={p.water_goal || ''}
                                onChange={(e) => handleInputChange('water_goal', e.target.value)}
                                placeholder="e.g. 2500"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Protein */}
                        <div>
                            <label htmlFor="target_protein" className="block text-sm font-medium text-gray-700">Protein (g)</label>
                            <input
                                type="number"
                                id="target_protein"
                                value={p.target_protein || ''}
                                onChange={(e) => handleInputChange('target_protein', e.target.value)}
                                placeholder="e.g. 150"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Carbs */}
                        <div>
                            <label htmlFor="target_carbs" className="block text-sm font-medium text-gray-700">Carbs (g)</label>
                            <input
                                type="number"
                                id="target_carbs"
                                value={p.target_carbs || ''}
                                onChange={(e) => handleInputChange('target_carbs', e.target.value)}
                                placeholder="e.g. 200"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Fat */}
                        <div>
                            <label htmlFor="target_fat" className="block text-sm font-medium text-gray-700">Fat (g)</label>
                            <input
                                type="number"
                                id="target_fat"
                                value={p.target_fat || ''}
                                onChange={(e) => handleInputChange('target_fat', e.target.value)}
                                placeholder="e.g. 65"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        {/* Fiber */}
                        <div>
                            <label htmlFor="target_fiber" className="block text-sm font-medium text-gray-700">Fiber (g)</label>
                            <input
                                type="number"
                                id="target_fiber"
                                value={p.target_fiber || ''}
                                onChange={(e) => handleInputChange('target_fiber', e.target.value)}
                                placeholder="e.g. 30"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        {saveStatus === 'success' && (
                            <span className="text-sm text-green-600 font-medium animate-fade-in">
                                Goals updated successfully
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-sm text-red-600 font-medium animate-fade-in">
                                Failed to update goals
                            </span>
                        )}
                        <button
                            onClick={handleSaveGoals}
                            disabled={saveStatus === 'saving'}
                            className={`px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${saveStatus === 'saving'
                                ? 'bg-green-400 text-white cursor-wait'
                                : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {saveStatus === 'saving' ? 'Saving...' : 'Save Goals'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
