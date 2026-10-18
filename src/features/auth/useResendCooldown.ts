import { useCallback, useEffect, useState } from 'react';

/** Délai minimal imposé par Supabase entre deux e-mails envoyés à une même adresse. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Compte à rebours avant de pouvoir renvoyer un e-mail. */
export function useResendCooldown(startActive: boolean) {
  const [until, setUntil] = useState(() => (startActive ? Date.now() + RESEND_COOLDOWN_SECONDS * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const start = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setUntil(current + RESEND_COOLDOWN_SECONDS * 1000);
  }, []);

  return { remaining: Math.max(0, Math.ceil((until - now) / 1000)), start };
}
