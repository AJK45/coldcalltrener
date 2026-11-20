import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useTrainer } from './TrainerProvider';
export default function SyncStatus() {
  const { syncStatus, syncError, revision, saveNow } = useTrainer();
  const busy = syncStatus === 'saving' || syncStatus === 'pending';
  return <div className={`mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[10px] ${syncStatus === 'offline' ? 'border-amber-400/25 bg-amber-400/5 text-amber-300' : 'border-border bg-card text-muted-foreground'}`} role="status"><span className="flex items-center gap-2">{busy ? <Loader2 size={13} className="animate-spin"/> : syncStatus === 'offline' ? <CloudOff size={13}/> : <Cloud size={13} className="text-primary"/>}{syncStatus === 'saved' ? `Synchronizované · verzia ${revision}` : busy ? 'Ukladám zmeny online… Pred odchodom počkajte na potvrdenie.' : 'Spojenie zlyhalo. Zmeny zostávajú v lokálnom koncepte.'}</span>{syncStatus === 'offline' && <button onClick={() => void saveNow()} className="underline">Skúsiť uloženie znova</button>}{syncError && <p className="w-full leading-relaxed">{syncError}</p>}</div>;
}
