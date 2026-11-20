import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContext';
import { useAuthReturn } from '@/lib/useAuthReturn';
import { authErrorMessage } from '@/lib/auth-errors';
import AuthFrame from '@/components/AuthFrame';
import { Busy } from '@/components/PageParts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function ResetPassword() {
  const { pending, error: callbackError } = useAuthReturn();
  const { session, loading, finishRecovery } = useSession();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError('Heslá sa nezhodujú.'); return; }
    setBusy(true);
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) throw failure;
      finishRecovery(); navigate('/', { replace: true });
    } catch (failure) { setError(authErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <AuthFrame title="Nastaviť nové heslo" description="Použite jedinečné heslo s aspoň 12 znakmi.">{pending || loading ? <Busy text="Overujem odkaz na obnovu…"/> : callbackError || !session ? <><p role="alert" className="text-xs text-destructive">{callbackError || 'Najprv otvorte platný odkaz z e-mailu na obnovu hesla.'}</p><Link to="/prihlasenie" className="mt-5 block text-xs text-primary">Vyžiadať nový odkaz →</Link></> : <form onSubmit={submit} className="space-y-5"><div><label htmlFor="new-password" className="label">Nové heslo</label><Input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl bg-background"/></div><div><label htmlFor="confirm-password" className="label">Zopakujte nové heslo</label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={e => setConfirmation(e.target.value)} className="h-11 rounded-xl bg-background"/></div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}<Button disabled={busy} className="h-11 w-full rounded-xl text-xs">{busy ? 'Ukladám…' : 'Uložiť nové heslo'}</Button></form>}</AuthFrame>;
}
