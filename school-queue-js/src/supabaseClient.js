import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://shrsnvxoqytlbqxbnilf.supabase.co';
const supabaseAnonKey = 'sb_publishable_irr_-q1Dc_royzYEpQIApw_uBAMy3eQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);