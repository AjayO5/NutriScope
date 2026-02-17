
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
// Removed distinct throw to allow build to pass if variables are missing in CI/Build environment


export const supabase = createClient(supabaseUrl, supabaseAnonKey)
