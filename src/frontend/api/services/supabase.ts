/**
 * @file        supabase.ts
 * @description
 *
 * @author      [Peiyu Wang]
 * @created    Friday
 * @license     © 2026 . All rights reserved.
 */

import { createClient } from '@supabase/supabase-js';

// Explicitly use localStorage so session persists across tabs and page reloads.
// Without this, Supabase may fall back to sessionStorage in some environments,
// which is cleared when the user re-enters the URL or closes the tab.
export const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
	{
		auth: {
			persistSession: true,
			storage: localStorage,
			autoRefreshToken: true,
		},
	}
);