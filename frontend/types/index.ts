export interface Profile {
    id: string
    height: number | null
    weight: number | null
    age: number | null
    gender: string | null
    activity_level: string | null
    water_goal: number | null
    protein_goal: number | null
    created_at?: string
    updated_at?: string
}

export interface WaterLog {
    id: string
    user_id: string
    date: string
    amount_ml: number
    logged_at: string
}

export interface DailyLog {
    id: number
    user_id: string
    date: string
    logged_at: string
    food_name: string
    quantity_consumed_grams: number
    meal_type: string
    energy_kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number
}

export interface AlertResponse {
    alerts: string[]
}
