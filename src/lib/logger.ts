/**
 * Journalisation minimale. Ne consigne jamais de jeton, de mot de passe ni d'adresse e-mail.
 * Un service de télémétrie pourra être branché ici (non configuré dans le MVP).
 */
type Level = 'info' | 'warn' | 'error';

function log(level: Level, event: string, detail?: unknown) {
  if (!__DEV__ && level === 'info') return;
  const line = `[atlas] ${event}`;
  if (level === 'error') console.error(line, detail ?? '');
  else if (level === 'warn') console.warn(line, detail ?? '');
  else console.log(line, detail ?? '');
}

export const logger = {
  info: (event: string, detail?: unknown) => log('info', event, detail),
  warn: (event: string, detail?: unknown) => log('warn', event, detail),
  error: (event: string, detail?: unknown) => log('error', event, detail),
};
