export type PublicRuntimeConfig = {
  supabaseUrl: string | null;
  supabaseKey: string | null;
  appUrl: string | null;
};

export function isSecretKey(key: string): boolean;
export function publicRuntimeConfig(env: Record<string, string | undefined>): PublicRuntimeConfig;
