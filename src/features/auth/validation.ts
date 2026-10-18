/** Même règle que la contrainte `profiles.display_name` côté base. */
export const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9À-ÖØ-öø-ÿ _.-]{3,24}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_MIN_LENGTH = 8;

export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateDisplayName(value: string): string | null {
  const name = normalizeDisplayName(value);
  if (name.length < 3) return 'Le pseudo doit contenir au moins 3 caractères.';
  if (name.length > 24) return 'Le pseudo doit contenir au plus 24 caractères.';
  if (!DISPLAY_NAME_PATTERN.test(name)) {
    return 'Utilisez uniquement des lettres, des chiffres, des espaces, « . », « _ » ou « - ».';
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Saisissez votre adresse e-mail.';
  if (!EMAIL_PATTERN.test(value.trim())) return 'Cette adresse e-mail n’est pas valide.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (!/[A-Za-zÀ-ÿ]/.test(value) || !/[0-9]/.test(value)) {
    return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  }
  return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  return password === confirmation ? null : 'Les deux mots de passe ne correspondent pas.';
}
