import {
  normalizeDisplayName,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from './validation';

describe('validation des formulaires', () => {
  it('accepte les pseudos conformes à la contrainte serveur', () => {
    expect(validateDisplayName('Élodie_42')).toBeNull();
    expect(validateDisplayName('Jean-Luc Picard')).toBeNull();
    expect(normalizeDisplayName('  Ana   Maria ')).toBe('Ana Maria');
  });

  it('refuse les pseudos trop courts, trop longs ou avec caractères interdits', () => {
    expect(validateDisplayName('ab')).toMatch(/au moins 3/);
    expect(validateDisplayName('a'.repeat(25))).toMatch(/au plus 24/);
    expect(validateDisplayName('<script>')).toMatch(/uniquement/);
    expect(validateDisplayName('emoji 🌍')).toMatch(/uniquement/);
  });

  it('valide l’adresse e-mail', () => {
    expect(validateEmail('')).toMatch(/Saisissez/);
    expect(validateEmail('paul@exemple')).toMatch(/pas valide/);
    expect(validateEmail(' paul@exemple.fr ')).toBeNull();
  });

  it('exige un mot de passe d’au moins 8 caractères avec lettre et chiffre', () => {
    expect(validatePassword('court1')).toMatch(/8 caractères/);
    expect(validatePassword('motdepasse')).toMatch(/lettre et un chiffre/);
    expect(validatePassword('atlas2026')).toBeNull();
    expect(validatePasswordConfirmation('a', 'b')).toMatch(/correspondent/);
    expect(validatePasswordConfirmation('a', 'a')).toBeNull();
  });
});
