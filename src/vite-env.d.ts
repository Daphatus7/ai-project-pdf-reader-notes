/// <reference types="vite/client" />

/***
 * Configure file for Vite environment variables
 ***/
interface ImportMetaEnv {
	readonly VITE_API_BASE_URL: string;
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
