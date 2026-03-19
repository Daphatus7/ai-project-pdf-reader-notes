import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { en, type Translations } from "./locales/en";
import { zh } from "./locales/zh";

export type Language = "en" | "zh";

const STORAGE_KEY = "atlas-language";

/* Detect initial language: localStorage preference → browser locale → fallback English */
function detectLanguage(): Language {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "en" || stored === "zh") return stored;
	return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

const translations: Record<Language, Translations> = { en, zh };

/* ── Context ── */
interface LanguageContextValue {
	lang: Language;
	t: Translations;
	toggle: () => void;
	setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/* ── Provider — wrap the landing page (or the entire app) ── */
export function LanguageProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Language>(detectLanguage);

	const setLang = useCallback((next: Language) => {
		localStorage.setItem(STORAGE_KEY, next);
		setLangState(next);
	}, []);

	const toggle = useCallback(() => {
		setLang(lang === "en" ? "zh" : "en");
	}, [lang, setLang]);

	return (
		<LanguageContext.Provider value={{ lang, t: translations[lang], toggle, setLang }}>
			{children}
		</LanguageContext.Provider>
	);
}

/* ── Hook — use anywhere inside LanguageProvider ── */
export function useLanguage(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
	return ctx;
}
