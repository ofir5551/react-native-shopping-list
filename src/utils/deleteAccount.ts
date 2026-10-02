import { supabase } from '../supabase';

/**
 * Permanently deletes the signed-in user's server-side account and data,
 * then ends the local session (AuthContext starts a fresh anonymous one).
 * Throws if the server call fails; the session is left intact in that case.
 */
export async function deleteAccount(): Promise<void> {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;
    // The user no longer exists server-side, so a global sign-out would 401.
    await supabase.auth.signOut({ scope: 'local' });
}
