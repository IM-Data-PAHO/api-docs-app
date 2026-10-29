import { DEFAULT_STRINGS } from './defaultStrings';

export const DATASTORE_NAMESPACE = 'api-docs';
export const OVERRIDES_KEY = 'program-overrides';

export const normalizeLocale = value => {
    if (typeof value !== 'string' || !value.trim()) {
        return 'en';
    }
    const [base, region] = value.trim().replace('-', '_').split('_');
    return region ? `${base.toLowerCase()}_${region}` : base.toLowerCase();
};

export const baseLocale = locale => normalizeLocale(locale).split('_')[0];

export const stringsKey = locale => `strings_${normalizeLocale(locale)}`;

// Built-in text for a locale (base language, then exact locale) layered over English.
export const builtInStrings = locale => {
    const normalized = normalizeLocale(locale);
    return {
        ...DEFAULT_STRINGS.en,
        ...DEFAULT_STRINGS[baseLocale(normalized)],
        ...DEFAULT_STRINGS[normalized],
    };
};

// English < built-in base < built-in exact < DataStore base < DataStore exact.
// `stored` maps a locale code to the key/value object read from the DataStore.
export const resolveStrings = (locale, stored = {}) => {
    const normalized = normalizeLocale(locale);
    return {
        ...builtInStrings(normalized),
        ...stored[baseLocale(normalized)],
        ...stored[normalized],
    };
};

export const TRANSLATION_KEYS = Object.keys(DEFAULT_STRINGS.en);
