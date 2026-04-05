import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mstuvrnnfsjomlzrakwp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdHV2cm5uZnNqb21senJha3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODU0NjgsImV4cCI6MjA4MTY2MTQ2OH0.elIDonpiDkfP89uqTaA4jdphH1lrb_7Dx0eDifyOvCE';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
