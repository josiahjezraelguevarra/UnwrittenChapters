export const COOKIE_CONSENT_KEY = 'uc_cookie_consent';

const OPTIONAL_STORAGE_KEYS = [
  'uc_home_theme',
  'uc_intro_seen',
  'uc_recent_galleries',
  'uc_visitor_id'
] as const;

export interface CookieConsentChoice {
  essential: true;
  preferences: boolean;
  decidedAt: string;
}

export function loadCookieConsent(): CookieConsentChoice | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentChoice>;
    if (typeof parsed.preferences !== 'boolean') return null;
    return {
      essential: true,
      preferences: parsed.preferences,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : ''
    };
  } catch {
    return null;
  }
}

export function canUsePreferenceStorage(): boolean {
  const consent = loadCookieConsent();
  return consent?.preferences !== false;
}

export function saveCookieConsent(preferences: boolean): CookieConsentChoice {
  const choice: CookieConsentChoice = {
    essential: true,
    preferences,
    decidedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(choice));
    if (!preferences) {
      for (const key of OPTIONAL_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }

  return choice;
}
