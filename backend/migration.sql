-- Drop existing table if exists (careful with data loss, but requested to "Create new")
DROP TABLE IF EXISTS daily_logs;

CREATE TABLE daily_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW(),

    food_name TEXT NOT NULL,
    quantity_consumed_grams NUMERIC NOT NULL,
    meal_type TEXT,

    energy_kcal DOUBLE PRECISION,
    protein_g DOUBLE PRECISION,
    carbs_g DOUBLE PRECISION,
    fat_g DOUBLE PRECISION,
    fiber_g DOUBLE PRECISION
);

-- Enable Row Level Security
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own logs
CREATE POLICY "Users can insert their own logs" ON daily_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own logs
CREATE POLICY "Users can view their own logs" ON daily_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to delete their own logs
CREATE POLICY "Users can delete their own logs" ON daily_logs
    FOR DELETE USING (auth.uid() = user_id);
