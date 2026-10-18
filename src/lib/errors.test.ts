import { AppError, errorMessage, toAppError } from './errors';

describe('toAppError', () => {
  it('traduit les exceptions métier PL/pgSQL', () => {
    const error = toAppError({ code: 'P0001', message: 'PACK_UNAVAILABLE', details: null, hint: null });
    expect(error.code).toBe('PACK_UNAVAILABLE');
    expect(error.message).toBe('Ce paquet a déjà été ouvert.');
    expect(error.retryable).toBe(false);
  });

  it('reconnaît les erreurs réseau comme récupérables', () => {
    const error = toAppError(new TypeError('Network request failed'));
    expect(error.code).toBe('NETWORK');
    expect(error.retryable).toBe(true);
    expect(toAppError({ name: 'AuthRetryableFetchError', message: 'x' }).code).toBe('NETWORK');
  });

  it('traduit les erreurs d’authentification Supabase', () => {
    expect(
      toAppError({ name: 'AuthApiError', code: 'invalid_credentials', message: 'Invalid login credentials' }).code,
    ).toBe('INVALID_CREDENTIALS');
    expect(toAppError({ code: 'user_already_exists', message: 'User already registered' }).code).toBe('EMAIL_TAKEN');
    expect(toAppError({ status: 429, message: 'too many' }).code).toBe('RATE_LIMITED');
  });

  it('traduit les violations de contraintes du pseudo', () => {
    expect(
      toAppError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_display_name_lower_idx"',
      }).code,
    ).toBe('DISPLAY_NAME_TAKEN');
    expect(toAppError({ code: '23514', message: 'violates check constraint "profiles_display_name_check"' }).code).toBe(
      'DISPLAY_NAME_INVALID',
    );
  });

  it('ne divulgue jamais le message technique d’une erreur inconnue', () => {
    const message = errorMessage(new Error('relation "secret_table" does not exist'));
    expect(message).not.toContain('secret_table');
    expect(message).toMatch(/inattendue/);
  });

  it('conserve une AppError existante', () => {
    const original = new AppError('NOT_CONFIGURED');
    expect(toAppError(original)).toBe(original);
  });
});
