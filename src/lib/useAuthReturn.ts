import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authErrorMessage } from '@/lib/auth-errors';

export function useAuthReturn() {
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function finish() {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('error') || new URLSearchParams(url.hash.slice(1)).has('error')) throw new Error('callback');
        // Let the SDK finish automatic implicit/PKCE initialization before considering
        // a manual exchange, otherwise a single-use code can be redeemed twice.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const code = url.searchParams.get('code');
        if (code && !data.session) {
          const { error: failure } = await supabase.auth.exchangeCodeForSession(code);
          if (failure) throw failure;
        }
        if (code) window.history.replaceState(null, '', url.pathname);
      } catch (failure) { if (active) setError(authErrorMessage(failure)); }
      finally { if (active) setPending(false); }
    }
    void finish();
    return () => { active = false; };
  }, []);
  return { pending, error };
}
