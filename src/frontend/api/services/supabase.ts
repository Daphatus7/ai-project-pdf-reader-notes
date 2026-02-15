/**
 * @file        supabase.ts
 * @description
 *
 * @author      [Peiyu Wang]
 * @created    Friday
 * @license     © 2026 . All rights reserved.
 */

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
);