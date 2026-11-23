import { z } from 'zod';
import { personaSchema, reportSchema, type Store } from './trainer';

export type CloudData = { version: 1 } & Pick<Store, 'businesses' | 'products' | 'calls' | 'plan'>;
export type Workspace = { revision: number; data: CloudData };
export type Draft = { revision: number; base: CloudData; data: CloudData; settings: Store['settings'] };

const text = z.string();
const businessSchema = z.object({ id: text.min(1), name: text.min(1), industry: text, website: text, description: text, audience: text, usp: text, objections: text, proof: text, process: text, goal: text, knowledge: text });
const productSchema = z.object({ id: text.min(1), businessId: text.min(1), name: text.min(1), description: text, price: text, known: text, private: text });
const configSchema = z.object({ businessId: text, productId: text, intent: text, mode: text, difficulty: z.number().int().min(1).max(10), rudeness: z.number().int().min(1).max(10), goal: text, context: text, preset: text });
const callSchema = z.object({ id: text.min(1), created: text.datetime(), duration: z.number().nonnegative(), config: configSchema, persona: personaSchema, businessName: text, productName: text, turns: z.array(z.object({ id: text.min(1), role: z.enum(['user', 'assistant']), text, seconds: z.number().nonnegative() })), status: z.enum(['active', 'completed', 'interrupted']), report: reportSchema.optional(), model: text, rubric: text, error: text.optional() });

// This project disables strictNullChecks, which makes Zod infer object keys as optional.
// The boundary schemas still validate every required key at runtime.
export const cloudDataSchema = z.object({ version: z.literal(1), businesses: z.array(businessSchema), products: z.array(productSchema), calls: z.array(callSchema), plan: z.object({ text, created: text.datetime(), model: text }).nullable() }).superRefine((data, ctx) => {
  for (const key of ['businesses', 'products', 'calls'] as const) {
    if (new Set(data[key].map(item => item.id)).size !== data[key].length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Opakované identifikátory.', path: [key] });
  }
}) as z.ZodType<CloudData>;
export const workspaceSchema = z.object({ revision: z.number().int().positive(), payload: cloudDataSchema });

export function toCloudData(store: Store): CloudData {
  return { version: 1, businesses: store.businesses, products: store.products, calls: store.calls, plan: store.plan };
}
export function fromCloudData(data: CloudData, settings: Store['settings']): Store {
  return { businesses: data.businesses, products: data.products, calls: data.calls, plan: data.plan, settings };
}
export function dataEqual(a: CloudData, b: CloudData) {
  // PostgreSQL JSONB can reorder object keys. Arrays retain their meaningful order.
  const serialize = (data: CloudData) => JSON.stringify(data, (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
  return serialize(a) === serialize(b);
}
export function mergeImport(current: CloudData, incoming: CloudData): CloudData {
  function merge<T extends { id: string }>(existing: T[], added: T[]) {
    const ids = new Set(existing.map(item => item.id));
    return [...existing, ...added.filter(item => !ids.has(item.id))];
  }
  return { version: 1, businesses: merge(current.businesses, incoming.businesses), products: merge(current.products, incoming.products), calls: merge(current.calls, incoming.calls), plan: current.plan ?? incoming.plan };
}
export function parseImport(input: unknown): CloudData {
  const source = z.object({ businesses: z.array(z.unknown()), products: z.array(z.unknown()), calls: z.array(z.unknown()), plan: z.unknown().optional() }).parse(input);
  return cloudDataSchema.parse({ version: 1, ...source, plan: source.plan ?? null });
}
const draftSchema = z.object({ revision: z.number().int().nonnegative(), base: cloudDataSchema, data: cloudDataSchema, settings: z.object({ provider: z.enum(['gemini', 'ollama']).optional(), endpoint: text, model: text, consentSpeech: z.boolean(), voice: text, rate: z.number().min(0.6).max(1.4), tested: z.boolean(), testedModel: text, theme: z.enum(['dark', 'light']), weeklyGoal: z.number().int().min(1).max(50) }) }) as z.ZodType<Draft>;
export const draftKey = (id: string) => `trener-online-draft-v1:${id}`;
export function readDraft(id: string): Draft | null {
  const value = localStorage.getItem(draftKey(id));
  if (!value) return null;
  return draftSchema.parse(JSON.parse(value));
}
export function writeDraft(id: string, draft: Draft) { localStorage.setItem(draftKey(id), JSON.stringify(draft)); }
export function reconcile(remote: Workspace, draft: Draft | null) {
  if (!draft || dataEqual(draft.data, draft.base)) return { data: remote.data, conflict: false, dirty: false };
  if (dataEqual(draft.data, remote.data)) return { data: remote.data, conflict: false, dirty: false };
  if (draft.revision === remote.revision && dataEqual(draft.base, remote.data)) return { data: draft.data, conflict: false, dirty: true };
  return { data: draft.data, conflict: true, dirty: true };
}
