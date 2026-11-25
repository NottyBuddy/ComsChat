import { createClient } from '@supabase/supabase-js'

// Publishable client key is intended for browser use; all data access remains protected by RLS.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://ldpjbwewyihgpfncpumr.supabase.co'
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || 'sb_publishable_9QVhO-Y1iXZtwbczRFI4FQ_lT2N8LJr'

export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

// Supabase Auth email/password is used with synthetic identifiers to avoid requiring
// employees to provide personal email addresses or phone numbers.
export function authEmailForId(identifier: string) {
  const normalized = identifier.trim().toLowerCase().replace(/[^a-z0-9-_.]/g, '')
  return normalized + '@comschat.invalid'
}
