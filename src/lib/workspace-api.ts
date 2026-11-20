import { supabase } from '@/integrations/supabase/client';
import { workspaceSchema, type CloudData, type Workspace } from './cloud-store';

export async function fetchWorkspace(userId: string, empty: CloudData): Promise<Workspace> {
  const { data, error } = await supabase.from('training_workspace').select('revision, payload').eq('user_id', userId).abortSignal(AbortSignal.timeout(15000)).maybeSingle();
  if (error) throw new Error('Online dáta sa nepodarilo načítať. Skontrolujte pripojenie a schválenie účtu.');
  if (!data) return { revision: 0, data: empty };
  const row = workspaceSchema.safeParse(data);
  if (!row.success) throw new Error('Online dáta majú nepodporovaný formát. Nebudú prepísané.');
  return { revision: row.data.revision, data: row.data.payload };
}
export async function saveWorkspace(revision: number, payload: CloudData): Promise<Workspace | null> {
  const { data, error } = await supabase.rpc('save_training_workspace', { expected_revision: revision, new_payload: payload }).abortSignal(AbortSignal.timeout(20000));
  if (error) throw new Error('Synchronizácia zlyhala. Lokálny koncept zostáva zachovaný. Skontrolujte pripojenie a prístup účtu.');
  if (!Array.isArray(data)) throw new Error('Server nevrátil platné potvrdenie zápisu.');
  if (!data.length) return null;
  const row = workspaceSchema.safeParse(data[0]);
  if (!row.success) throw new Error('Server nepotvrdil platný formát uložených dát.');
  return { revision: row.data.revision, data: row.data.payload };
}
