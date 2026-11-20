import { useRef, useState } from 'react';
import { Cloud, Download, LogOut, Upload, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from './SessionContext';
import { useTrainer } from './TrainerProvider';
import { Button } from '@/components/ui/button';
import { download } from '@/lib/trainer';
import { parseImport, draftKey, readDraft, dataEqual } from '@/lib/cloud-store';
import { toast } from 'sonner';

export default function AccountSettings() {
  const { session, signOut } = useSession();
  const { store, importData, syncStatus, revision, hasPending, saveNow } = useTrainer();
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function confirmImport(source: unknown) {
    try {
      const wrapper = source as { data?: unknown } | null;
      const incoming = parseImport(wrapper?.data ?? source);
      if (!window.confirm(`Odoslať do súkromného účtu ${incoming.businesses.length} podnikaní, ${incoming.products.length} produktov a ${incoming.calls.length} hovorov vrátane prepisov? Existujúce položky s rovnakým ID zostanú zachované. Nastavenia hlasu ani súhlasy sa neimportujú.`)) return;
      if (importData(incoming)) toast.success('Import bol pridaný do lokálneho konceptu. Počkajte na potvrdenie synchronizácie.');
    } catch { toast.error('Záloha nemá platný formát Trénera Hovorov. Nič sa neimportovalo.'); }
  }
  function importLegacy() {
    const raw = localStorage.getItem('trener-hovorov-v1');
    if (!raw) { toast.info('V tomto prehliadači nie sú pôvodné lokálne dáta. Na pôvodnom zariadení vytvorte export JSON.'); return; }
    try { confirmImport(JSON.parse(raw)); } catch { toast.error('Pôvodnú zálohu nemožno prečítať. Zostala nezmenená.'); }
  }
  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    if (selected.size > 20 * 1024 * 1024) { toast.error('Súbor je príliš veľký na bezpečný import v prehliadači (najviac 20 MB).'); return; }
    try { confirmImport(JSON.parse(await selected.text())); } catch { toast.error('Súbor nie je platná záloha JSON.'); }
  }
  async function logout() {
    if (hasPending && !window.confirm('Niektoré zmeny ešte nie sú online. Najprv odporúčame export zálohy. Odhlásiť sa a ponechať lokálny koncept na tomto zariadení?')) return;
    setBusy(true);
    try {
      await signOut();
      try {
        const remaining = session ? readDraft(session.user.id) : null;
        if (remaining && dataEqual(remaining.data, remaining.base)) localStorage.removeItem(draftKey(session.user.id));
      } catch { /* Preserve a draft if its acknowledged state cannot be verified. */ }
      navigate('/prihlasenie', { replace: true });
    } catch { toast.error('Odhlásenie zlyhalo. Skúste to znova.'); }
    finally { setBusy(false); }
  }
  return <section className="panel mb-6 space-y-5 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-base font-semibold"><Cloud size={19} className="text-primary"/>Súkromný online účet</h2><p className="mt-2 break-all text-xs text-muted-foreground">{session?.user.email}</p></div><Button variant="outline" disabled={busy} onClick={logout} className="gap-2 text-xs"><LogOut size={14}/>Odhlásiť sa</Button></div><p className="text-xs leading-relaxed text-muted-foreground">Podnikanie, produkty, hovory, prepisy a plány sa ukladajú do vášho schváleného účtu v Supabase. Nové zmeny sa odosielajú automaticky. Súhlasy hlasu, hlas, téma a lokálna adresa Ollama ostávajú iba na tomto zariadení. Nahrávky ani platené AI spracovanie nie sú zapnuté.</p><div className="rounded-xl border border-border p-4"><p className="text-xs font-medium">Pôvodné dáta sa neimportujú automaticky</p><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Import spustíte výslovne. Pôvodná lokálna záloha zostane nedotknutá. Pri rovnakom ID má prednosť online verzia. Lokálne koncepty sú na tomto zariadení nešifrované; používajte dôveryhodný profil prehliadača.</p><div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" className="gap-2 text-xs" onClick={importLegacy}><Upload size={14}/>Importovať pôvodné dáta</Button><Button variant="outline" className="gap-2 text-xs" onClick={() => file.current?.click()}><Upload size={14}/>Importovať zálohu JSON</Button><input type="file" accept="application/json,.json" className="hidden" ref={file} onChange={importFile} aria-label="Vybrať zálohu JSON"/></div></div><div className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-[10px] text-muted-foreground"><ShieldCheck size={13} className="text-primary"/>Online verzia {revision} · {syncStatus === 'saved' ? 'Uložené' : 'Skontrolujte stav synchronizácie nad stránkou'}</span><div className="flex flex-wrap gap-3"><Button variant="outline" className="gap-2 text-xs" onClick={() => download('trener-hovorov-zaloha.json', JSON.stringify(store, null, 2))}><Download size={14}/>Exportovať zálohu</Button><Button className="text-xs" disabled={!hasPending || syncStatus === 'saving'} onClick={() => void saveNow()}>Uložiť teraz</Button></div></div></section>;
}
