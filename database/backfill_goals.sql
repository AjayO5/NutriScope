-- Backfill missing nutritional goals based on profile data
-- Run this in the Supabase REST SQL Editor

UPDATE profiles
SET
  -- Calculate TDEE (which becomes target_calories)
  -- Logic:
  -- 1. BMR (Mifflin-St Jeor): 10*W + 6.25*H - 5*A + ( +5 Male / -161 Female )
  -- 2. TDEE = BMR * Activity Level
  -- 3. Adjust for Goal Type (Lose -500, Gain +500)
  target_calories = (
    -- Base TDEE Calculation
    (
      (
        (10 * weight) + 
        (6.25 * height) - 
        (5 * age) + 
        (CASE WHEN gender = 'Male' THEN 5 ELSE -161 END)
      ) * CAST(activity_level AS DECIMAL)
    )
    -- Goal Adjustment
    + (CASE 
        WHEN goal_type = 'lose' THEN -500 
        WHEN goal_type = 'gain' THEN 500 
        ELSE 0 
       END)
  ),

  -- Protein: 1.6g/kg
  target_protein = ROUND(weight * 1.6),

  -- Fat: 0.8g/kg
  target_fat = ROUND(weight * 0.8),

  -- Fiber: Fixed 30g
  target_fiber = 30,

  -- Water: Fixed 2500ml
  water_goal = 2500

WHERE target_calories IS NULL 
   OR target_calories = 0;

-- Second Pass: Calculate Carbs based on the NEW target_calories and target_fat/protein
-- Postgres updates rows atomically, so we can't reference the *new* target_calories in the *same* SET clause easily 
-- without recalculating the whole expression.
-- It is cleaner to do this in a second pass or use a CTE.

WITH calculations AS (
  SELECT 
    id,
    -- Re-calculate TDEE for Carb calculation reference
    (
      (
        (10 * weight) + 
        (6.25 * height) - 
        (5 * age) + 
        (CASE WHEN gender = 'Male' THEN 5 ELSE -161 END)
      ) * CAST(activity_level AS DECIMAL)
    ) + (CASE 
        WHEN goal_type = 'lose' THEN -500 
        WHEN goal_type = 'gain' THEN 500 
        ELSE 0 
       END) as calc_tdee,
    
    ROUND(weight * 1.6) as calc_protein,
    ROUND(weight * 0.8) as calc_fat
  FROM profiles
  WHERE target_carbs IS NULL OR target_carbs = 0
)
UPDATE profiles p
SET
  target_carbs = ROUND(
    (c.calc_tdee - ((c.calc_protein * 4) + (c.calc_fat * 9))) / 4
  )
FROM calculations c
WHERE p.id = c.id
  AND (p.target_carbs IS NULL OR p.target_carbs = 0);
