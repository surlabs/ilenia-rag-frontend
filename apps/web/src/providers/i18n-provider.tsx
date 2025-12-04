"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import esTranslations from "@/locales/es.json";
import euTranslations from "@/locales/eu.json";
import glTranslations from "@/locales/gl.json";
import vaTranslations from "@/locales/va.json";

export type Locale = "es" | "eu" | "gl" | "va";

export const LANGUAGES = [
	{ code: "es" as const, label: "Castellano" },
	{ code: "eu" as const, label: "Euskera" },
	{ code: "gl" as const, label: "Galego" },
	{ code: "va" as const, label: "Valencià" },
] as const;

type Translations = typeof esTranslations;

const translations: Record<Locale, Translations> = {
	es: esTranslations,
	eu: euTranslations,
	gl: glTranslations,
	va: vaTranslations,
};

type NestedKeyOf<T> = T extends object
	? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K) : never }[keyof T]
	: never;

type TranslationKey = NestedKeyOf<Translations>;

type InterpolationParams = Record<string, string | number | undefined>;

interface I18nContextType {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: TranslationKey, params?: InterpolationParams) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_COOKIE_NAME = "ilenia-locale";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
	const keys = path.split(".");
	let result: unknown = obj;
	for (const key of keys) {
		if (result && typeof result === "object" && key in result) {
			result = (result as Record<string, unknown>)[key];
		} else {
			return path;
		}
	}
	return typeof result === "string" ? result : path;
}

function interpolate(template: string, params?: InterpolationParams): string {
	if (!params) return template;
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
		const value = params[key];
		return value !== undefined ? String(value) : `{{${key}}}`;
	});
}

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>("es");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const cookieValue = document.cookie
			.split("; ")
			.find((row) => row.startsWith(`${LOCALE_COOKIE_NAME}=`))
			?.split("=")[1] as Locale | undefined;

		if (cookieValue && translations[cookieValue]) {
			setLocaleState(cookieValue);
		}
		setMounted(true);
	}, []);

	const setLocale = useCallback((newLocale: Locale) => {
		setLocaleState(newLocale);
		document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}`;
		document.documentElement.lang = newLocale;
	}, []);

	const t = useCallback(
		(key: TranslationKey, params?: InterpolationParams): string => {
			let resolvedKey = key;
			if (params?.count !== undefined) {
				const count = Number(params.count);
				const suffix = count === 1 ? "_one" : "_other";
				const pluralKey = `${key}${suffix}`;
				const pluralValue = getNestedValue(translations[locale] as unknown as Record<string, unknown>, pluralKey);
				if (pluralValue !== pluralKey) {
					resolvedKey = pluralKey as TranslationKey;
				}
			}
			const template = getNestedValue(translations[locale] as unknown as Record<string, unknown>, resolvedKey);
			return interpolate(template, params);
		},
		[locale]
	);

	const value = useMemo(
		() => ({ locale, setLocale, t }),
		[locale, setLocale, t]
	);

	if (!mounted) {
		const fallbackT = (key: TranslationKey, params?: InterpolationParams): string => {
			let resolvedKey = key;
			if (params?.count !== undefined) {
				const count = Number(params.count);
				const suffix = count === 1 ? "_one" : "_other";
				const pluralKey = `${key}${suffix}`;
				const pluralValue = getNestedValue(esTranslations as unknown as Record<string, unknown>, pluralKey);
				if (pluralValue !== pluralKey) {
					resolvedKey = pluralKey as TranslationKey;
				}
			}
			return interpolate(getNestedValue(esTranslations as unknown as Record<string, unknown>, resolvedKey), params);
		};
		return (
			<I18nContext.Provider value={{ locale: "es", setLocale: () => {}, t: fallbackT }}>
				{children}
			</I18nContext.Provider>
		);
	}

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error("useTranslation must be used within an I18nProvider");
	}
	return context;
}
