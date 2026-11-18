import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadStore, saveStore, type Store } from '@/lib/trainer';
import { toast } from 'sonner';
const Context = createContext<{ store: Store; update: (fn: (s: Store) => Store) => void } | null>(null);
export function TrainerProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState(loadStore);
  useEffect(() => { document.documentElement.dataset.theme = store.settings.theme; }, [store.settings.theme]);
  function update(fn: (s: Store) => Store) { setStore(previous => { const next = fn(previous); try { saveStore(next); } catch { toast.error('Zápis do úložiska zlyhal. Uvoľnite miesto alebo exportujte dáta.'); return previous; } return next; }); }
  return <Context.Provider value={{ store, update }}>{children}</Context.Provider>;
}
export function useTrainer() { const value = useContext(Context); if (!value) throw new Error('Chýba kontext aplikácie.'); return value; }
