import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { emptyStore, download, type Store } from '@/lib/trainer';
import { dataEqual, fromCloudData, mergeImport, parseImport, readDraft, reconcile, toCloudData, writeDraft, type CloudData, type Workspace } from '@/lib/cloud-store';
import { fetchWorkspace, saveWorkspace } from '@/lib/workspace-api';
import { useSession } from './SessionContext';
import { Button } from '@/components/ui/button';
import { Busy } from '@/components/PageParts';
import { toast } from 'sonner';

type SyncStatus = 'loading' | 'saved' | 'pending' | 'saving' | 'offline' | 'conflict' | 'error';
type TrainerContext = {
  store: Store; update: (fn: (s: Store) => Store) => boolean; syncStatus: SyncStatus; syncError: string;
  revision: number; saveNow: () => Promise<void>; reloadRemote: () => Promise<void>;
  importData: (input: unknown) => boolean; hasPending: boolean;
};
const Context = createContext<TrainerContext | null>(null);

export function TrainerProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session!.user.id;
  const [store, setStore] = useState<Store>(emptyStore);
  const current = useRef(store);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const status = useRef<SyncStatus>('loading');
  const [syncError, setSyncError] = useState('');
  const [revision, setRevision] = useState(0);
  const remote = useRef<Workspace>({ revision: 0, data: toCloudData(emptyStore()) });
  const dirty = useRef(false);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  function showStatus(value: SyncStatus) { status.current = value; if (alive.current) setSyncStatus(value); }
  function cache(next: Store, base = remote.current) {
    writeDraft(userId, { revision: base.revision, base: base.data, data: toCloudData(next), settings: next.settings });
  }
  function schedule() {
    if (timer.current) return;
    timer.current = setTimeout(() => { timer.current = undefined; void flushRef.current(); }, 2000);
  }
  function applyRemote(workspace: Workspace, next: Store) {
    cache(next, workspace);
    remote.current = workspace; current.current = next;
    setRevision(workspace.revision); setStore(next);
  }

  const load = useCallback(async (discard: boolean) => {
    showStatus('loading'); setSyncError('');
    try {
      const workspace = await fetchWorkspace(userId, toCloudData(emptyStore()));
      if (!alive.current) return;
      const draft = discard ? null : readDraft(userId);
      const result = reconcile(workspace, draft);
      const next = fromCloudData(result.data, draft?.settings ?? current.current.settings);
      if (result.conflict && draft) {
        remote.current = { revision: draft.revision, data: draft.base };
        current.current = next; setStore(next); setRevision(draft.revision); dirty.current = true;
        setSyncError('Na inom zariadení sú novšie dáta. Váš lokálny koncept sme neprepísali.'); showStatus('conflict');
      } else {
        applyRemote(workspace, next); dirty.current = result.dirty;
        showStatus(result.dirty ? 'pending' : 'saved');
        if (result.dirty) schedule();
      }
    } catch (error) {
      if (!alive.current) return;
      setSyncError(error instanceof Error ? error.message : 'Načítanie zlyhalo. Lokálne dáta neboli zmenené.');
      showStatus('error');
    }
  }, [userId]);

  async function flush() {
    if (!alive.current || inFlight.current || !dirty.current || ['conflict', 'loading', 'error'].includes(status.current)) return;
    inFlight.current = true; showStatus('saving'); setSyncError('');
    const submitted = toCloudData(current.current);
    try {
      const saved = await saveWorkspace(remote.current.revision, submitted);
      if (!alive.current) return;
      if (!saved) {
        setSyncError('Iné zariadenie medzitým zmenilo dáta. Automatické prepísanie bolo zastavené.'); showStatus('conflict'); return;
      }
      remote.current = saved; setRevision(saved.revision);
      dirty.current = !dataEqual(toCloudData(current.current), submitted);
      cache(current.current, saved);
      showStatus(dirty.current ? 'pending' : 'saved');
      if (dirty.current) schedule();
    } catch (error) {
      if (alive.current) { setSyncError(error instanceof Error ? error.message : 'Zápis zlyhal.'); showStatus('offline'); }
    } finally { inFlight.current = false; }
  }
  flushRef.current = flush;

  const update = useCallback((fn: (s: Store) => Store) => {
    if (['loading', 'error', 'conflict'].includes(status.current) || !alive.current) return false;
    const previous = current.current;
    const next = fn(previous);
    try { cache(next); }
    catch { toast.error('Lokálny zápis zlyhal. Uvoľnite miesto a exportujte zálohu. Zmena nebola prijatá.'); return false; }
    current.current = next; setStore(next);
    if (!dataEqual(toCloudData(next), toCloudData(previous))) {
      dirty.current = true;
      if (!inFlight.current) showStatus('pending');
      schedule();
    }
    return true;
  }, [userId]);

  useEffect(() => {
    alive.current = true; void load(false);
    return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); };
  }, [load]);
  useEffect(() => { document.documentElement.dataset.theme = store.settings.theme; }, [store.settings.theme]);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } }
    async function refresh() {
      if (document.hidden || !alive.current || inFlight.current || ['loading', 'error', 'conflict'].includes(status.current)) return;
      if (dirty.current) { await flushRef.current(); return; }
      inFlight.current = true;
      try {
        const next = await fetchWorkspace(userId, toCloudData(emptyStore()));
        if (!alive.current) return;
        if (dirty.current) { schedule(); return; }
        if (next.revision < remote.current.revision) throw new Error('Prístup k online dátam sa zmenil. Prihláste sa znova.');
        if (next.revision !== remote.current.revision) applyRemote(next, fromCloudData(next.data, current.current.settings));
        showStatus('saved'); setSyncError('');
      } catch (error) { if (alive.current) { setSyncError(error instanceof Error ? error.message : 'Spojenie zlyhalo.'); showStatus('offline'); } }
      finally { inFlight.current = false; }
    }
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh); clearInterval(interval);
    };
  }, [userId]);

  function importData(input: unknown) {
    const incoming = parseImport(input);
    return update(s => fromCloudData(mergeImport(toCloudData(s), incoming), s.settings));
  }
  async function saveNow() {
    if (dirty.current) await flush();
    else if (!inFlight.current) await load(false);
  }
  const value: TrainerContext = { store, update, syncStatus, syncError, revision, saveNow, reloadRemote: () => load(true), importData, hasPending: dirty.current };
  if (syncStatus === 'loading') return <div className="flex min-h-screen items-center justify-center"><Busy text="Načítavam vaše súkromné online dáta…"/></div>;
  if (syncStatus === 'error' || syncStatus === 'conflict') return <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5"><section className="panel space-y-5 p-7"><p className="eyebrow text-primary">OCHRANA VAŠICH DÁT</p><h1 className="text-xl font-semibold">{syncStatus === 'conflict' ? 'Zastavili sme konflikt medzi zariadeniami' : 'Dáta sa nepodarilo bezpečne načítať'}</h1><p role="alert" className="text-xs leading-relaxed text-muted-foreground">{syncError}</p><p className="subtle">Nič neprepíšeme automaticky. Najprv si exportujte lokálny koncept. Načítanie online verzie potom nahradí tento koncept; export môžete neskôr skontrolovať a importovať.</p><div className="flex flex-wrap gap-3"><Button variant="outline" className="text-xs" onClick={() => { const draft = localStorage.getItem(`trener-online-draft-v1:${userId}`); download('lokalny-koncept.json', draft ?? JSON.stringify(current.current)); }}>Exportovať koncept</Button>{syncStatus === 'error' && <Button variant="outline" className="text-xs" onClick={() => void load(false)}>Skúsiť znova</Button>}<Button className="text-xs" onClick={() => { if (window.confirm('Načítať online verziu a nahradiť lokálny koncept? Najprv si uložte export.')) void load(true); }}>Načítať online verziu</Button></div></section></div>;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTrainer() {
  const value = useContext(Context);
  if (!value) throw new Error('Chýba kontext aplikácie.');
  return value;
}
