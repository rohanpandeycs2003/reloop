import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://brreogyaoendshqfjrjr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_6X0egPCxt26GFohd_LU3EQ_kd39lZmc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
