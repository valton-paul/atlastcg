import { useEffect, useState } from 'react';

/** Secondes restantes avant `targetIso`, mises à jour chaque seconde ; `null` sans cible. */
export function useCountdown(targetIso: string | null | undefined): number | null {
  const target = targetIso ? Date.parse(targetIso) : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= target) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

/** 3725 → « 1:02:05 » ; 125 → « 2:05 ». */
export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
