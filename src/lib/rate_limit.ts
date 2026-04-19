import { createClient } from './supabase/server';

/**
 * CREEDA Infrastructure Rate Limiter
 * Uses DB-backed tracking for cross-server synchronization.
 */
export async function rateLimit(
    key: string, 
    limit: number, 
    windowSeconds: number,
    options?: {
        failOpen?: boolean
    }
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    
    // Call DB rate limiter RPC
    const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds
    });

    if (error) {
        console.error(`[Rate Limit Error] Key: ${key}`, error);
        if (options?.failOpen !== true) {
            return {
                success: false,
                error: 'Rate limiting is temporarily unavailable. Please try again shortly.',
            };
        }

        return { success: true }; // Fail open for non-sensitive flows if DB is reachable but RPC fails
    }

    if (!isAllowed) {
        return { 
            success: false, 
            error: `Too many attempts. Please wait ${windowSeconds} seconds.` 
        };
    }

    return { success: true };
}
