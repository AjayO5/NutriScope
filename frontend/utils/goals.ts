import { supabase } from '../lib/supabase';

export function calculateProgress(current: number, goal: number) {
    const safeCurrent = current || 0
    const safeGoal = goal || 0
    if (safeGoal === 0) return 0;
    return Math.round((safeCurrent / safeGoal) * 100);
}

export function calculateRemaining(current: number, goal: number) {
    const safeCurrent = current || 0
    const safeGoal = goal || 0
    return Math.max(safeGoal - safeCurrent, 0);
}

export interface UserGoals {
    target_calories: number;
    target_protein: number;
    target_carbs: number;
    target_fat: number;
    target_fiber: number;
    water_goal: number;
}

export async function fetchUserGoals(userId: string): Promise<UserGoals | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('target_calories, target_protein, target_carbs, target_fat, target_fiber, water_goal')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user goals:', error);
        return null;
    }

    if (!data) return null;

    return {
        target_calories: data.target_calories || 0,
        target_protein: data.target_protein || 0,
        target_carbs: data.target_carbs || 0,
        target_fat: data.target_fat || 0,
        target_fiber: data.target_fiber || 0,
        water_goal: data.water_goal || 0
    };
}
