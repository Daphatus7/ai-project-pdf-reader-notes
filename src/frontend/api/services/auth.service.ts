/**
 * @file        auth.service.ts
 *
 * @author      [Peiyu Wang]
 * @created     Sunday
 * @license     © 2026 . All rights reserved.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

export async function getAccessToken(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({
		email: email,
		password: password
	});

	if (error) {
		console.log('Error: ', error.message);
	} else {
		console.log('✅ Success!');
	}
	return data;
}

export async function logout() {
	const resposne = await supabase.auth.signOut();
	console.log(resposne);
}

