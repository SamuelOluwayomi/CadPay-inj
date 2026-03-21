'use client';

import { useUser } from '@/context/UserContext';

/**
 * Backward compatibility hook that wraps the UserContext.
 * Use useUser() directly in new code.
 */
export function useUserProfile() {
    return useUser();
}
