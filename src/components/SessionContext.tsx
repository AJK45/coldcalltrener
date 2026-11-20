import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { type Session } from '@supabase/supabase-js';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { authErrorMessage } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { Busy } from '@/components/PageParts';

const RECOVERY = 'trener-password-recovery';
type Access = 'loading' | 'approved' | 'denied' | 'error';
const Context = createContext<{
  session: Session | null; loading: boolean; access: Access; error: string; recovery: boolean;
  finishRecovery: () => void; signOut: () => Promise<void>; retry: () => void;
} | null>(null);

export function SessionContextProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<Access>('loading');
  const [checkedUser, setCheckedUser] = useState('');
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(() => sessionStorage.getItem(RECOVERY) === '1');
  const [attempt, setAttempt] = useState(0);
  const sequence = useRef(0);

  useEffect(() => {
    let active = true;
    let observed = false;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      observed = true;
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem(RECOVERY, '1'); setRecovery(true);
      }
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(RECOVERY); setRecovery(false); setError('');
      }
      setSession(next); setLoading(false);
    });
    void supabase.auth.getSession().then(({ data, error: failure }) => {
      if (!active || observed) return;
      if (failure) setError(authErrorMessage(failure));
      setSession(data.session); setLoading(false);
    }).catch(() => { if (active && !observed) { setError(authErrorMessage(null)); setLoading(false); } });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const request = ++sequence.current;
    if (!session) { setAccess('denied'); return; }
    setAccess(previous => checkedUser === session.user.id && previous === 'approved' ? previous : 'loading');
    setError('');
    void Promise.resolve(supabase.from('private_owner').select('user_id').eq('user_id', session.user.id).maybeSingle()).then(({ data, error: failure }) => {
      if (sequence.current !== request) return;
      setCheckedUser(session.user.id);
      if (failure) { setAccess('error'); setError('Prístup sa nepodarilo overiť. Skúste to znova.'); }
      else setAccess(data ? 'approved' : 'denied');
    }).catch(() => {
      if (sequence.current !== request) return;
      setCheckedUser(session.user.id); setAccess('error'); setError('Prístup sa nepodarilo overiť. Skontrolujte pripojenie.');
    });
    return () => { sequence.current++; };
  }, [session?.user.id, session?.access_token, attempt]);

  const signOut = useCallback(async () => {
    const { error: failure } = await supabase.auth.signOut({ scope: 'local' });
    if (failure) { setError(authErrorMessage(failure)); throw new Error('Odhlásenie zlyhalo. Skúste ho znova.'); }
    setSession(null); setError(''); setAccess('denied'); setCheckedUser('');
  }, []);
  function finishRecovery() { sessionStorage.removeItem(RECOVERY); setRecovery(false); }
  const effectiveAccess = session && checkedUser !== session.user.id ? 'loading' : access;
  return <Context.Provider value={{ session, loading, access: effectiveAccess, error, recovery, finishRecovery, signOut, retry: () => setAttempt(n => n + 1) }}>{children}</Context.Provider>;
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('Chýba kontext prihlásenia.');
  return value;
}

export function RequireOwner() {
  const { session, loading, access, error, recovery, retry, signOut } = useSession();
  const location = useLocation();
  if (loading || (session && access === 'loading')) return <div className="flex min-h-screen items-center justify-center"><Busy text="Overujem súkromný prístup…" /></div>;
  if (!session) return <Navigate to="/prihlasenie" replace state={{ from: location.pathname }} />;
  if (recovery) return <Navigate to="/reset-password" replace />;
  if (access !== 'approved') return <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6"><section className="panel space-y-5 p-8"><p className="eyebrow text-primary">SÚKROMNÝ PRIESTOR</p><h1 className="text-2xl font-semibold">{access === 'error' ? 'Overenie prístupu zlyhalo' : 'Tento účet ešte nemá povolený prístup'}</h1><p className="subtle">{error || 'Prihlásenie nestačí. Vlastník musí tento účet výslovne schváliť v databáze. Verejná registrácia ani automatické pridelenie vlastníctva nie sú súčasťou aplikácie.'}</p><p className="break-all text-xs text-muted-foreground">{session.user.email}</p><div className="flex gap-3"><Button variant="outline" onClick={retry} className="text-xs">Overiť znova</Button><Button onClick={() => void signOut().catch(() => undefined)} className="text-xs">Odhlásiť sa</Button></div></section></div>;
  return <Outlet />;
}
