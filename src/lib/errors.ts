/**
 * Gestion centralisée des erreurs : toute erreur (serveur, réseau, authentification,
 * validation) est convertie en `AppError` portant un code stable et un message en français
 * présentable à l'utilisateur. Les détails techniques ne sont jamais affichés.
 */

export type AppErrorCode =
  | 'NETWORK'
  | 'NOT_CONFIGURED'
  | 'SERVER_NOT_READY'
  | 'NOT_AUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'LINK_EXPIRED'
  | 'EMAIL_TAKEN'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN'
  | ServerErrorCode;

export const SERVER_ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  INVALID_ARGUMENT: 'La demande est incomplète. Réessayez depuis l’écran précédent.',
  PACK_NOT_FOUND: 'Ce paquet est introuvable dans votre inventaire.',
  PACK_UNAVAILABLE: 'Ce paquet a déjà été ouvert.',
  PACK_POOL_EMPTY: 'Ce paquet ne peut pas être ouvert pour le moment. Il reste dans votre inventaire.',
  PACK_MISCONFIGURED: 'Ce paquet ne peut pas être ouvert pour le moment. Il reste dans votre inventaire.',
  IDEMPOTENCY_KEY_REUSED: 'Cette ouverture a déjà été utilisée. Rechargez votre inventaire.',
  INSUFFICIENT_FRAGMENTS: 'Vous n’avez pas encore assez de fragments.',
  EXPEDITION_NOT_FOUND: 'Cette expédition est introuvable.',
  EXPEDITION_LOCKED: 'Obtenez au moins une carte de ce pays pour débloquer son expédition.',
  EXPEDITION_NOT_STARTED: 'Démarrez l’expédition avant de répondre.',
  EXPEDITION_ALREADY_COMPLETED: 'Cette expédition est déjà terminée.',
  EXPEDITION_POOL_EMPTY:
    'Aucune destination disponible : découvrez un nouveau pays (au moins une carte) ou terminez l’expédition en cours.',
  EXPEDITION_DAILY_LIMIT: 'Vous avez déjà lancé 3 expéditions aujourd’hui. Revenez demain.',
  EXPEDITION_NO_CHARGE:
    'Aucune charge d’expédition disponible. Une nouvelle charge arrive toutes les 30 minutes (max. 10).',
  DRAW_NOT_FOUND: 'Ce tirage d’expédition est introuvable.',
  STEP_NOT_FOUND: 'Cette étape est introuvable.',
  STEP_LOCKED: 'Terminez d’abord les étapes précédentes.',
  STEPS_INCOMPLETE: 'Il reste des étapes à terminer.',
  INVALID_CHOICE: 'Cette réponse n’est pas valide.',
  OBJECTIVE_NOT_FOUND: 'Cet objectif est introuvable.',
  OBJECTIVE_NOT_COMPLETED: 'Cet objectif n’est pas encore atteint.',
  STEP_MISCONFIGURED: 'Cette étape n’est pas disponible pour le moment.',
  CONFIRMATION_REQUIRED: 'Saisissez « SUPPRIMER » pour confirmer.',
  PROFILE_CREATION_FAILED: 'Votre profil n’a pas pu être préparé. Réessayez dans un instant.',
  FRIEND_CODE_NOT_FOUND: 'Aucun explorateur ne correspond à ce code.',
  CANNOT_FRIEND_SELF: 'Ce code est le vôtre : partagez-le avec vos amis.',
  FRIEND_REQUEST_CONFLICT: 'Une demande ou une amitié existe déjà avec cet explorateur.',
  TOO_MANY_PENDING_REQUESTS: 'Vous avez beaucoup de demandes en attente. Patientez avant d’en envoyer d’autres.',
  FRIEND_REQUEST_NOT_FOUND: 'Cette demande n’existe plus.',
  NOT_FRIENDS: 'Vous devez être amis pour effectuer cette action.',
  CHALLENGE_NOT_FOUND: 'Ce défi est introuvable.',
  CHALLENGE_LINK_INVALID: 'Ce lien de défi n’est plus valide.',
  CHALLENGE_FULL: 'Ce défi a atteint le nombre maximal de participants.',
  CHALLENGE_EXPIRED: 'Ce défi est terminé.',
  CHALLENGE_ALREADY_COMPLETED: 'Vous avez déjà répondu à ce défi.',
  CHALLENGE_POOL_TOO_SMALL: 'Il n’y a pas encore assez de pays publiés pour ce défi.',
  CHALLENGE_RATE_LIMITED: 'Vous avez créé beaucoup de défis aujourd’hui. Revenez demain.',
  TOO_MANY_INVITEES: 'Vous pouvez inviter jusqu’à 10 amis par défi.',
  INVALID_REWARD_QUANTITY: 'Cette récompense n’est pas disponible pour le moment.',
  SETTING_MISSING: 'Ce service n’est pas disponible pour le moment.',
  PLAYER_NOT_INITIALIZED: 'Votre atlas est en cours de préparation. Réessayez dans un instant.',
  DROP_RATES_MUST_SUM_TO_ONE: 'Ce paquet n’est pas disponible pour le moment.',
  DISPLAY_NAME_INVALID:
    'Le pseudo doit contenir de 3 à 24 caractères (lettres, chiffres, espaces, « . », « _ » ou « - »).',
  DISPLAY_NAME_TAKEN: 'Ce pseudo est déjà utilisé par un autre explorateur.',
  FORBIDDEN: 'Cette action n’est pas autorisée.',
} as const;

export type ServerErrorCode = keyof typeof SERVER_ERROR_MESSAGES;

const CLIENT_MESSAGES: Record<Exclude<AppErrorCode, ServerErrorCode>, string> = {
  NETWORK: 'Connexion impossible. Vérifiez votre réseau puis réessayez.',
  NOT_CONFIGURED: 'L’application n’est pas reliée à son serveur. Contactez l’équipe Atlas TCG.',
  SERVER_NOT_READY: 'Le serveur Atlas TCG n’est pas encore prêt : sa base de données n’a pas été initialisée.',
  SESSION_EXPIRED: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  INVALID_CREDENTIALS: 'Adresse e-mail ou mot de passe incorrect.',
  EMAIL_NOT_CONFIRMED: 'Confirmez votre adresse e-mail grâce au lien reçu, puis connectez-vous.',
  LINK_EXPIRED: 'Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel e-mail de confirmation.',
  EMAIL_TAKEN: 'Un compte existe déjà avec cette adresse e-mail.',
  WEAK_PASSWORD: 'Choisissez un mot de passe plus robuste (au moins 8 caractères).',
  INVALID_EMAIL: 'Cette adresse e-mail n’est pas valide.',
  RATE_LIMITED: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
  INVALID_RESPONSE: 'Le serveur a répondu de façon inattendue. Réessayez dans un instant.',
  UNKNOWN: 'Une erreur inattendue est survenue. Réessayez dans un instant.',
};

const RETRYABLE: ReadonlySet<AppErrorCode> = new Set(['NETWORK', 'INVALID_RESPONSE', 'UNKNOWN', 'RATE_LIMITED']);

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, cause?: unknown, message?: string) {
    super(message ?? messageFor(code));
    this.name = 'AppError';
    this.code = code;
    this.retryable = RETRYABLE.has(code);
    this.cause = cause;
  }
}

export function messageFor(code: AppErrorCode): string {
  if (code in SERVER_ERROR_MESSAGES) return SERVER_ERROR_MESSAGES[code as ServerErrorCode];
  return CLIENT_MESSAGES[code as Exclude<AppErrorCode, ServerErrorCode>] ?? CLIENT_MESSAGES.UNKNOWN;
}

function isServerCode(value: string): value is ServerErrorCode {
  return Object.prototype.hasOwnProperty.call(SERVER_ERROR_MESSAGES, value);
}

const AUTH_CODES: Record<string, AppErrorCode> = {
  invalid_credentials: 'INVALID_CREDENTIALS',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
  otp_expired: 'LINK_EXPIRED',
  user_already_exists: 'EMAIL_TAKEN',
  email_exists: 'EMAIL_TAKEN',
  weak_password: 'WEAK_PASSWORD',
  email_address_invalid: 'INVALID_EMAIL',
  validation_failed: 'INVALID_EMAIL',
  over_email_send_rate_limit: 'RATE_LIMITED',
  over_request_rate_limit: 'RATE_LIMITED',
  session_not_found: 'SESSION_EXPIRED',
  refresh_token_not_found: 'SESSION_EXPIRED',
  bad_jwt: 'SESSION_EXPIRED',
};

type ErrorLike = { code?: unknown; message?: unknown; name?: unknown; status?: unknown };

/** Convertit n'importe quelle erreur en `AppError`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (!error || typeof error !== 'object') return new AppError('UNKNOWN', error);

  const e = error as ErrorLike;
  const message = typeof e.message === 'string' ? e.message : '';
  const code = typeof e.code === 'string' ? e.code : '';

  // Exceptions métier PL/pgSQL : `raise exception 'CODE' using errcode = 'P0001'`.
  if (code === 'P0001' && isServerCode(message)) return new AppError(message, error);
  if (isServerCode(message)) return new AppError(message, error);
  // Privilège refusé (RLS ou absence de droit) : ne doit pas arriver dans un usage normal.
  if (code === '42501') return new AppError('FORBIDDEN', error);
  // Contraintes de la table `profiles` lors de la modification du pseudo.
  if (code === '23505' && /display_name/.test(message)) return new AppError('DISPLAY_NAME_TAKEN', error);
  if (code === '23514' && /display_name/.test(message)) return new AppError('DISPLAY_NAME_INVALID', error);
  if (code === 'PGRST301' || code === 'PGRST303') return new AppError('SESSION_EXPIRED', error);
  // Table ou fonction absente : migrations non appliquées sur le projet.
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(code)) return new AppError('SERVER_NOT_READY', error);

  if (code && AUTH_CODES[code]) return new AppError(AUTH_CODES[code], error);
  if (e.name === 'AuthApiError' && /invalid login credentials/i.test(message)) {
    return new AppError('INVALID_CREDENTIALS', error);
  }
  if (e.status === 429) return new AppError('RATE_LIMITED', error);

  if (
    e.name === 'AuthRetryableFetchError' ||
    /network request failed|failed to fetch|fetch failed|network error|load failed/i.test(message)
  ) {
    return new AppError('NETWORK', error);
  }
  if (e.name === 'ZodError') return new AppError('INVALID_RESPONSE', error);
  return new AppError('UNKNOWN', error);
}

export function errorMessage(error: unknown): string {
  return toAppError(error).message;
}
