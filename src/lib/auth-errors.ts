import { AuthApiError } from '@supabase/supabase-js';

export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (error.code === 'invalid_credentials') return 'E-mail alebo heslo nie sú správne.';
    if (error.code === 'email_not_confirmed') return 'Najprv potvrďte svoju e-mailovú adresu.';
    if (error.status === 429) return 'Príliš veľa pokusov. Počkajte chvíľu a skúste to znova.';
    if (error.code === 'same_password') return 'Nové heslo musí byť iné ako pôvodné.';
    if (error.code === 'weak_password') return 'Zvoľte silnejšie heslo s aspoň 12 znakmi.';
  }
  return 'Overenie sa nepodarilo. Skontrolujte pripojenie a platnosť prihlasovacieho odkazu.';
}
