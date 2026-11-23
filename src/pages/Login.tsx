import { useEffect, useRef, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContext';
import AuthFrame from '@/components/AuthFrame';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authErrorMessage } from '@/lib/auth-errors';
import { appUrl } from '@/lib/app-url';

export default function Login() {
  const { session, loading, recovery, error: sessionError } = useSession();
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const authContainer = useRef<HTMLDivElement>(null);

  // Auth UI does not expose an onError callback or localizable API errors.
  // Keep its form, but display a localized message instead of its native error node.
  useEffect(() => {
    const root = authContainer.current;
    if (!root) return;
    const observer = new MutationObserver(() => {
      const native = root.querySelector('.trainer-native-auth-message');
      const text = native?.textContent?.trim();
      if (text) setError(text.toLowerCase().includes('invalid login') ? 'E-mail alebo heslo nie sú správne.' : text.toLowerCase().includes('email not confirmed') ? 'Najprv potvrďte svoju e-mailovú adresu.' : 'Prihlásenie zlyhalo. Skontrolujte údaje a pripojenie, prípadne skúste neskôr.');
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [forgot]);

  async function reset(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('/reset-password') });
      if (failure) throw failure;
      setMessage('Ak táto adresa patrí účtu, dostanete odkaz na obnovu hesla. Skontrolujte aj priečinok nevyžiadanej pošty.');
    } catch (failure) { setError(authErrorMessage(failure)); }
    finally { setBusy(false); }
  }

  if (!loading && session) return <Navigate to={recovery ? '/reset-password' : '/'} replace />;
  return <AuthFrame title={forgot ? 'Obnoviť heslo' : 'Vitajte späť.'} description={forgot ? 'Pošleme vám bezpečný odkaz na nastavenie nového hesla.' : 'Prihláste sa e-mailom a heslom do svojho tréningového priestoru.'}>
    {forgot ? <form onSubmit={reset} className="space-y-4"><label htmlFor="reset-email" className="label">E-mail</label><Input id="reset-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} placeholder="vas@email.sk" className="h-11 rounded-xl bg-background"/><Button disabled={busy} className="h-11 w-full rounded-xl text-xs">{busy ? 'Odosielam…' : 'Odoslať odkaz'}</Button></form> : <div ref={authContainer} onInput={() => setError('')}><Auth supabaseClient={supabase} view="sign_in" providers={[]} showLinks={false} magicLink={false} redirectTo={appUrl('/auth/callback')} theme="dark" appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#91dfb8', brandAccent: '#a7ebc8', brandButtonText: '#15362a', inputBackground: '#101519', inputText: '#edf7f0', inputBorder: '#303a40', inputLabelText: '#b1c7ba', inputPlaceholder: '#8c969c' }, radii: { borderRadiusButton: '12px', inputBorderRadius: '12px' }, fonts: { bodyFontFamily: 'DM Sans, sans-serif', buttonFontFamily: 'DM Sans, sans-serif', inputFontFamily: 'DM Sans, sans-serif', labelFontFamily: 'DM Sans, sans-serif' } } }, className: { message: 'trainer-native-auth-message hidden' } }} localization={{ variables: { sign_in: { email_label: 'E-mail', password_label: 'Heslo', email_input_placeholder: 'vas@email.sk', password_input_placeholder: 'Vaše heslo', button_label: 'Prihlásiť sa', loading_button_label: 'Prihlasujem…' } } }}/></div>}
    {(error || sessionError) && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{error || sessionError}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-primary/10 p-3 text-xs leading-relaxed text-primary">{message}</p>}
    <button type="button" className="mt-5 text-xs text-primary hover:underline" onClick={() => { setForgot(!forgot); setError(''); setMessage(''); }}>{forgot ? 'Späť na prihlásenie' : 'Zabudli ste heslo?'}</button>
    <div className="mt-8 border-t border-border pt-5 text-[10px] leading-relaxed text-muted-foreground">Registrácia nie je dostupná. Správca najprv vytvorí účet a schváli jeho prístup. Online AI používa Gemini cez váš Google projekt. Hlasové služby vyžadujú samostatný súhlas.</div>
  </AuthFrame>;
}
