export type UserGoal = "fat_loss" | "muscle_gain" | "maintenance";

export interface EvaluationInput {
    caloriesConsumed: number;
    calorieGoal: number;
    proteinConsumed: number;
    proteinGoal: number;
    waterConsumed: number;
    waterGoal: number;
    lastMealTime: string | Date | null;
    userGoal: UserGoal;
}

export type Status = "behind" | "on_track" | "ahead";

export interface NutrientStatus {
    status: Status;
    actual: number;
    expected: number;
    goal: number;
}

export interface EvaluationResult {
    calories: NutrientStatus;
    protein: NutrientStatus;
    water: NutrientStatus;
}

export function evaluateDailyHealth({
    caloriesConsumed,
    calorieGoal,
    proteinConsumed,
    proteinGoal,
    waterConsumed,
    waterGoal,
    lastMealTime,
    userGoal
}: EvaluationInput): EvaluationResult {
    // 1. Get current hour
    const currentHour = new Date().getHours();

    // 2. Calculate expected progress based on time
    // Using a linear assumption over 24 hours
    const expectedRatio = currentHour / 24;

    const calculateStatus = (actual: number, goal: number): NutrientStatus => {
        // Handle edge case where goal is 0
        if (goal <= 0) return { status: 'on_track', actual, expected: 0, goal: 0 };

        // 3. Calculate expected intake
        const expected = goal * expectedRatio;

        // 4. Compare actual vs expected
        let status: Status = 'on_track';

        if (expected > 0) {
            const percentageOfExpected = actual / expected;

            if (percentageOfExpected < 0.7) {
                status = 'behind';
            } else if (percentageOfExpected > 1.2) {
                status = 'ahead';
            } else {
                status = 'on_track';
            }
        } else {
            // If expected is 0 (e.g., midnight starts at 0), any consumption is 'ahead' or 0 is 'on_track'
            if (actual > 0) status = 'ahead';
            else status = 'on_track';
        }

        return { status, actual, expected, goal };
    };

    return {
        calories: calculateStatus(caloriesConsumed, calorieGoal),
        protein: calculateStatus(proteinConsumed, proteinGoal),
        water: calculateStatus(waterConsumed, waterGoal)
    };
}

export type AlertType = "critical" | "warning" | "info" | "positive";

export interface Alert {
    type: AlertType;
    message: string;
}

export function generateAlerts(
    evaluation: EvaluationResult,
    userGoal: UserGoal,
    lastMealTime: string | Date | null
): Alert[] {
    const alerts: Alert[] = [];
    const currentHour = new Date().getHours();

    // 1. Calories behind
    if (evaluation.calories.status === "behind") {
        alerts.push({ type: "warning", message: "You're behind on calories for this time of day." });
    }

    // 2. Protein behind
    if (evaluation.protein.status === "behind") {
        alerts.push({ type: "warning", message: "Protein intake is lower than expected." });
    }

    // 3. Water behind
    if (evaluation.water.status === "behind") {
        alerts.push({ type: "warning", message: "Hydration is below expected levels." });
    }

    // 4. Calories ahead & fat loss
    if (evaluation.calories.status === "ahead" && userGoal === "fat_loss") {
        alerts.push({ type: "critical", message: "You're exceeding calorie target for fat loss." });
    }

    // 5. Protein ahead & muscle gain
    if (evaluation.protein.status === "ahead" && userGoal === "muscle_gain") {
        alerts.push({ type: "positive", message: "Great protein intake for muscle recovery!" });
    }

    // 6. Meal Check
    if (lastMealTime) {
        const lastMealDate = new Date(lastMealTime);
        const now = new Date();
        // Ensure we are comparing correctly
        if (!isNaN(lastMealDate.getTime())) {
            const hoursSinceLastMeal = (now.getTime() - lastMealDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastMeal > 6) {
                alerts.push({ type: "warning", message: "You haven't logged food in over 6 hours." });
            }
        }
    }

    // 7. Under-eating late check
    if (currentHour > 21 && evaluation.calories.actual < (evaluation.calories.goal * 0.5)) {
        alerts.push({ type: "warning", message: "You may be under-eating today." });
    }

    // 8. Late high calorie check
    if (currentHour > 21 && evaluation.calories.actual > (evaluation.calories.goal * 1.2)) {
        alerts.push({ type: "warning", message: "High calorie intake late in the day." });
    }

    // Sort by priority: critical > warning > info > positive
    const priorityMap: Record<AlertType, number> = {
        "critical": 0,
        "warning": 1,
        "info": 2,
        "positive": 3
    };

    alerts.sort((a, b) => priorityMap[a.type] - priorityMap[b.type]);

    // Limit to 3 max
    if (alerts.length > 3) {
        const limitedAlerts = alerts.slice(0, 3);
        limitedAlerts.push({ type: "info", message: "Additional insights available." });
        return limitedAlerts;
    }

    return alerts;
}

export interface DailyHistory {
    date: string;
    caloriesConsumed: number;
    calorieGoal: number;
    proteinConsumed: number;
    proteinGoal: number;
    waterConsumed: number;
    waterGoal: number;
}

export interface StreakResult {
    calorieStreak: number;
    proteinStreak: number;
    hydrationStreak: number;
}

export function calculateStreaks(previousDaysData: DailyHistory[]): StreakResult {
    let calorieStreak = 0;
    let proteinStreak = 0;
    let hydrationStreak = 0;

    let cActive = true;
    let pActive = true;
    let hActive = true;

    for (const day of previousDaysData) {
        if (cActive) {
            const calRatio = day.caloriesConsumed / (day.calorieGoal || 1);
            if (calRatio >= 0.7 && calRatio <= 1.2) calorieStreak++;
            else cActive = false;
        }
        if (pActive) {
            const protRatio = day.proteinConsumed / (day.proteinGoal || 1);
            if (protRatio >= 0.7) proteinStreak++;
            else pActive = false;
        }
        if (hActive) {
            const waterRatio = day.waterConsumed / (day.waterGoal || 1);
            if (waterRatio >= 0.7) hydrationStreak++;
            else hActive = false;
        }
        if (!cActive && !pActive && !hActive) break;
    }

    return { calorieStreak, proteinStreak, hydrationStreak };
}

export function generateStreakAlerts(streaks: StreakResult): Alert[] {
    const alerts: Alert[] = [];
    if (streaks.calorieStreak >= 3 || streaks.proteinStreak >= 3 || streaks.hydrationStreak >= 3) {
        alerts.push({
            type: "positive",
            message: `🔥 You're on a 3-day streak!`
        });
    }
    return alerts;
}

export function calculateHealthScore(evaluation: EvaluationResult): number {
    const getRatio = (metric: NutrientStatus) => {
        if (!metric.goal || metric.goal === 0) return 0;
        return Math.min(metric.actual / metric.goal, 1);
    };

    const calorieRatio = getRatio(evaluation.calories);
    const proteinRatio = getRatio(evaluation.protein);
    const waterRatio = getRatio(evaluation.water);

    const averageRatio = (calorieRatio + proteinRatio + waterRatio) / 3;
    return Math.round(averageRatio * 100);
}

export interface InsightInput extends EvaluationInput {
    previousDaysData: DailyHistory[];
}

export interface DailyInsights {
    healthScore: number;
    alerts: Alert[];
    evaluation: EvaluationResult;
    streaks: StreakResult;
    summary: string;
}

export function getDailyInsights(data: InsightInput): DailyInsights {
    // 1. Evaluate Basic Health
    const evaluation = evaluateDailyHealth(data);

    // 2. Calculate Health Score
    const healthScore = calculateHealthScore(evaluation);

    // 3. Calculate Streaks
    const streaks = calculateStreaks(data.previousDaysData);

    // 4. Generate Alerts from Evaluation
    const healthAlerts = generateAlerts(evaluation, data.userGoal, data.lastMealTime);

    // 5. Generate Streak Alerts
    const streakAlerts = generateStreakAlerts(streaks);

    // Combine and Sort Alerts
    let allAlerts = [...healthAlerts, ...streakAlerts];

    const priorityMap: Record<AlertType, number> = {
        "critical": 0,
        "warning": 1,
        "info": 2,
        "positive": 3
    };

    allAlerts.sort((a, b) => priorityMap[a.type] - priorityMap[b.type]);

    let finalAlerts = allAlerts;
    if (finalAlerts.length > 3) {
        finalAlerts = finalAlerts.slice(0, 3);
        const hasInfo = finalAlerts.some(a => a.message === "Additional insights available.");
        if (!hasInfo) {
            finalAlerts[2] = { type: "info", message: "Additional insights available." };
        }
    }

    // 6. Generate Summary
    let summary = "";
    if (healthScore > 80) {
        summary = "You're doing great today!";
    } else if (healthScore >= 50) {
        summary = "You're progressing well. Small improvements needed.";
    } else {
        summary = "Let's focus on improving today's balance.";
    }

    return {
        healthScore,
        alerts: finalAlerts,
        evaluation,
        streaks,
        summary
    };
}
