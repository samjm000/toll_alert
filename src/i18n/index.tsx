import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadLanguageCode, saveLanguageCode } from '../state/persistence';
import { isLanguageCode, LanguageCode, Strings, STRINGS } from './strings';

export type { LanguageCode, Segment, Strings } from './strings';
export { LANGUAGE_CODES, STRINGS } from './strings';

/**
 * The phone's own language if the app offers it, otherwise English. Uses
 * `Intl` rather than adding expo-localization — Hermes ships Intl on both
 * platforms, and a wrong guess here only costs one tap in the picker.
 */
export function deviceLanguage(): LanguageCode {
  try {
    const base = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0].toLowerCase();
    return isLanguageCode(base) ? base : 'en';
  } catch {
    return 'en';
  }
}

/**
 * The language to use outside React — the crossing alert and the reminders
 * are written from a headless background task with no provider mounted.
 */
export async function loadLanguage(): Promise<LanguageCode> {
  const stored = await loadLanguageCode();
  return isLanguageCode(stored) ? stored : deviceLanguage();
}

export async function loadStrings(): Promise<Strings> {
  return STRINGS[await loadLanguage()];
}

/** A config payment deadline in the chosen language, falling back to the English wording. */
export function deadlineText(t: Strings, englishLabel: string): string {
  return t.deadlines[englishLabel] ?? englishLabel.toLowerCase();
}

/**
 * A crossing's price for alert text. English keeps the config's full label
 * ("£12.50 per day (non-compliant vehicles)"); other languages get the bare
 * amount, since the label is untranslated operator wording.
 */
export function priceText(language: LanguageCode, price: { amount: number; label: string }): string {
  return language === 'en' ? price.label : `£${price.amount.toFixed(2)}`;
}

/** Formats a whole number with the language's own digit grouping ("1,700,000" / "1 700 000"). */
export function formatCount(language: LanguageCode, value: number): string {
  try {
    return value.toLocaleString(language === 'en' ? 'en-GB' : language);
  } catch {
    return String(value);
  }
}

interface LanguageContextValue {
  language: LanguageCode;
  t: Strings;
  setLanguage: (code: LanguageCode) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * `onChange` lets the app rewrite anything already scheduled in the old
 * language — the repeating unpaid reminders keep whatever text they were
 * scheduled with.
 */
export function LanguageProvider({ children, onChange }: { children: ReactNode; onChange?: () => void }) {
  const [language, setLanguageState] = useState<LanguageCode>(deviceLanguage);

  useEffect(() => {
    let cancelled = false;
    loadLanguage().then((code) => {
      if (!cancelled) setLanguageState(code);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(
    async (code: LanguageCode) => {
      setLanguageState(code);
      await saveLanguageCode(code);
      onChange?.();
    },
    [onChange]
  );

  const value = useMemo(() => ({ language, t: STRINGS[language], setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
