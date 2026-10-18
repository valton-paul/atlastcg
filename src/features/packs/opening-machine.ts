import type { OpeningResult } from './api';

/**
 * Déroulé de l'ouverture : paquet scellé → requête serveur → révélation carte par carte
 * → récapitulatif. Le résultat provient exclusivement du serveur ; l'animation ne fait que
 * mettre en scène un tirage déjà validé et enregistré.
 */
export type OpeningState =
  | { phase: 'sealed' }
  | { phase: 'opening' }
  | { phase: 'revealing'; result: OpeningResult; index: number; flipped: boolean }
  | { phase: 'summary'; result: OpeningResult }
  | { phase: 'error'; message: string; retryable: boolean };

export type OpeningEvent =
  | { type: 'OPEN' }
  | { type: 'RESOLVED'; result: OpeningResult }
  | { type: 'FAILED'; message: string; retryable: boolean }
  | { type: 'FLIP' }
  | { type: 'NEXT' }
  | { type: 'SKIP' }
  | { type: 'REPLAY' }
  | { type: 'RESET' };

export const initialOpeningState: OpeningState = { phase: 'sealed' };

export function openingReducer(state: OpeningState, event: OpeningEvent): OpeningState {
  switch (event.type) {
    case 'OPEN':
      return state.phase === 'sealed' || state.phase === 'error' ? { phase: 'opening' } : state;
    case 'RESOLVED':
      if (state.phase !== 'opening') return state;
      // Un paquet déjà ouvert (rejeu après coupure) va directement au récapitulatif.
      if (event.result.replayed) return { phase: 'summary', result: event.result };
      return { phase: 'revealing', result: event.result, index: 0, flipped: false };
    case 'FAILED':
      return state.phase === 'opening' ? { phase: 'error', message: event.message, retryable: event.retryable } : state;
    case 'FLIP':
      return state.phase === 'revealing' && !state.flipped ? { ...state, flipped: true } : state;
    case 'NEXT':
      if (state.phase !== 'revealing') return state;
      if (!state.flipped) return { ...state, flipped: true };
      if (state.index + 1 >= state.result.cards.length) return { phase: 'summary', result: state.result };
      return { ...state, index: state.index + 1, flipped: false };
    case 'SKIP':
      return state.phase === 'revealing' ? { phase: 'summary', result: state.result } : state;
    case 'REPLAY':
      // Rejoue la mise en scène du résultat déjà obtenu, sans nouvel appel serveur.
      return state.phase === 'summary' ? { phase: 'revealing', result: state.result, index: 0, flipped: false } : state;
    case 'RESET':
      return initialOpeningState;
  }
}

/** Ordre de révélation : la meilleure carte en dernier pour ménager la découverte. */
export function revealOrder<T extends { rarity: string; slot: number }>(
  cards: T[],
  rank: (rarity: string) => number,
): T[] {
  return [...cards].sort((a, b) => rank(a.rarity) - rank(b.rarity) || a.slot - b.slot);
}
