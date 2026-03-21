
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazily initialized so the client is never created during Next.js static
// rendering (which runs without env vars and would throw "supabaseUrl is required")
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
    if (!_supabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
        }
        _supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            }
        });
    }
    return _supabase;
}

// Proxy that forwards every property access to the lazily-created client.
// This keeps all call-sites unchanged (they just use `supabase.from(...)` etc.)
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getSupabaseClient() as any)[prop];
    },
});

let _merchantSupabase: SupabaseClient | null = null;
function getMerchantSupabaseClient(): SupabaseClient {
    if (!_merchantSupabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables');
        }
        _merchantSupabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                storageKey: 'cadpay-merchant-auth-token',
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            }
        });
    }
    return _merchantSupabase;
}

export const merchantSupabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getMerchantSupabaseClient() as any)[prop];
    },
});
