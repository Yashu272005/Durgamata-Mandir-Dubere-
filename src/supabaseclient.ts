import { createClient } from '@supabase/supabase-js';

const env = (import.meta as ImportMeta & {
    env: Record<string, string | undefined>;
}).env;
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const configError = {
    message: 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.',
    status: 500,
};

const makeFallbackQuery = () => {
    const query: any = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: configError }),
        update: () => query,
        insert: () => query,
        delete: () => query,
        upsert: () => query,
        then: (resolve: (value: { data: any[]; error: null }) => void) => resolve({ data: [], error: null }),
    };
    return query;
};

const fallbackAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    setSession: async () => ({ data: null, error: configError }),
    updateUser: async () => ({ data: null, error: configError }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: configError }),
    resetPasswordForEmail: async () => ({ data: null, error: configError }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } }, error: null }),
    admin: {
        getUserById: async () => ({ data: { user: null }, error: configError }),
        signOut: async () => ({ data: null, error: configError }),
        updateUserById: async () => ({ data: null, error: configError }),
    },
};

const fallbackStorage = {
    from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        upload: async () => ({ data: null, error: configError }),
        remove: async () => ({ data: null, error: configError }),
        list: async () => ({ data: [], error: configError }),
        update: async () => ({ data: null, error: configError }),
        delete: async () => ({ data: null, error: configError }),
    }),
};

const fallbackFunctions = {
    invoke: async () => ({ data: null, error: configError }),
};

const fallbackRpc = async () => ({ data: null, error: configError });
const fallbackFrom = () => makeFallbackQuery();

export const SUPABASE_URL: string = supabaseUrl ?? '';
// The anon key is PUBLIC by design (safe in the browser). All protection comes
// from Row Level Security + the Edge Functions. Never put the service-role key here.
export const SUPABASE_ANON_KEY: string = supabaseKey ?? '';
export const SUPABASE_CONFIGURED = isSupabaseConfigured;

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl!, supabaseKey!, {
        auth: {
            // Session lives only in this browser tab: closing the tab signs the admin out.
            storage: window.sessionStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true, // needed for the password-recovery link
        },
    })
    : ({
        auth: fallbackAuth,
        storage: fallbackStorage,
        functions: fallbackFunctions,
        from: fallbackFrom,
        rpc: fallbackRpc,
    } as any);

/** Public storage bucket holding gallery photos, videos and thumbnails. */
export const GALLERY_BUCKET = 'gallery-media';
