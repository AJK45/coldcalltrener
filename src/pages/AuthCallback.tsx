import { Link, Navigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContext';
import { useAuthReturn } from '@/lib/useAuthReturn';
import AuthFrame from '@/components/AuthFrame';
import { Busy } from '@/components/PageParts';
export default function AuthCallback() {
  const { pending, error } = useAuthReturn();
  const { session, loading, recovery } = useSession();
  if (!pending && !loading && !error && session) return <Navigate to={recovery ? '/reset-password' : '/'} replace />;
  return <AuthFrame title="Overenie prihlásenia" description="Bezpečne dokončujeme návrat do aplikácie.">{pending || loading ? <Busy text="Overujem odkaz…"/> : <><p role="alert" className="text-xs text-destructive">{error || 'Odkaz je neplatný alebo vypršal. Prihláste sa znova.'}</p><Link to="/prihlasenie" className="mt-5 block text-xs text-primary">Späť na prihlásenie →</Link></>}</AuthFrame>;
}
