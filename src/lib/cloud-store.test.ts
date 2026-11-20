import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyStore, type Business } from './trainer';
import { cloudDataSchema, dataEqual, draftKey, fromCloudData, mergeImport, parseImport, readDraft, reconcile, toCloudData, writeDraft, type Draft } from './cloud-store';

const business = (id: string, name = id): Business => ({ id, name, industry: '', website: '', description: '', audience: '', usp: '', objections: '', proof: '', process: '', goal: '', knowledge: '' });
const empty = () => toCloudData(emptyStore());
function draft(): Draft { return { revision: 1, base: empty(), data: { ...empty(), businesses: [business('local')] }, settings: emptyStore().settings }; }

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});

describe('Cloud boundaries and explicit import', () => {
  it('rejects missing required arrays and incomplete records', () => {
    expect(cloudDataSchema.safeParse({ version: 1, calls: [] }).success).toBe(false);
    expect(cloudDataSchema.safeParse({ ...empty(), businesses: [{ id: 'incomplete' }] }).success).toBe(false);
  });
  it('rejects duplicate identifiers instead of silently merging an invalid import', () => {
    expect(() => parseImport({ ...empty(), businesses: [business('same'), business('same')] })).toThrow();
  });
  it('rejects a wrong schema version and out-of-range difficulty', () => {
    expect(cloudDataSchema.safeParse({ ...empty(), version: 2 }).success).toBe(false);
    expect(() => parseImport({ ...empty(), calls: [{ config: { difficulty: 11 } }] })).toThrow();
  });
  it('imports only training data, never provider settings, consent or secrets', () => {
    const incoming = { ...emptyStore(), businesses: [business('legacy')], settings: { ...emptyStore().settings, consentSpeech: true, endpoint: 'https://external.example' }, secret: 'test-only' };
    const parsed = parseImport(incoming);
    expect(Object.keys(parsed).sort()).toEqual(['businesses', 'calls', 'plan', 'products', 'version']);
    expect(fromCloudData(parsed, emptyStore().settings).settings.consentSpeech).toBe(false);
    expect(incoming.businesses).toHaveLength(1);
  });
  it('preserves existing online IDs and imports new IDs without modifying either source', () => {
    const current = { ...empty(), businesses: [business('same', 'Online')] };
    const incoming = { ...empty(), businesses: [business('same', 'Local'), business('new')] };
    const merged = mergeImport(current, incoming);
    expect(merged.businesses.map(b => b.name)).toEqual(['Online', 'new']);
    expect(incoming.businesses[0].name).toBe('Local');
    expect(current.businesses).toHaveLength(1);
  });
  it('keeps device consent independent when applying remote data', () => {
    const settings = { ...emptyStore().settings, consentSpeech: false, model: 'local-only' };
    const store = fromCloudData({ ...empty(), businesses: [business('remote')] }, settings);
    expect(store.settings).toEqual(settings);
    expect(toCloudData(store)).not.toHaveProperty('settings');
  });
  it('treats reordered JSONB keys as equal without ignoring array order', () => {
    const a = { ...empty(), businesses: [business('one'), business('two')] };
    const b = { plan: null, calls: [], products: [], businesses: a.businesses.map(item => Object.fromEntries(Object.entries(item).reverse())) as Business[], version: 1 as const };
    expect(dataEqual(a, b)).toBe(true);
    expect(dataEqual(a, { ...a, businesses: [...a.businesses].reverse() })).toBe(false);
  });
});

describe('Durable drafts and revision conflict detection', () => {
  it('loads cloud data when there is no device draft', () => {
    expect(reconcile({ revision: 3, data: empty() }, null)).toEqual({ data: empty(), dirty: false, conflict: false });
  });
  it('restores unsent changes if the server revision and base still match', () => {
    const local = draft();
    expect(reconcile({ revision: 1, data: local.base }, local)).toEqual({ data: local.data, dirty: true, conflict: false });
  });
  it('never overwrites a dirty draft when another device saved newer data', () => {
    const local = draft();
    const result = reconcile({ revision: 2, data: { ...empty(), businesses: [business('remote')] } }, local);
    expect(result.conflict).toBe(true);
    expect(result.data.businesses[0].id).toBe('local');
  });
  it('detects a divergent base even if a revision number matches', () => {
    const local = draft();
    expect(reconcile({ revision: 1, data: { ...empty(), businesses: [business('other')] } }, local).conflict).toBe(true);
  });
  it('recovers a server-acknowledged write after its response was lost', () => {
    const local = draft();
    expect(reconcile({ revision: 2, data: local.data }, local)).toEqual({ data: local.data, dirty: false, conflict: false });
  });
  it('loads newer remote data for a clean device draft', () => {
    const local = { ...draft(), data: empty() };
    const remote = { ...empty(), businesses: [business('new')] };
    expect(reconcile({ revision: 2, data: remote }, local)).toEqual({ data: remote, dirty: false, conflict: false });
  });
  it('isolates drafts per account and preserves the original legacy key', () => {
    localStorage.setItem('trener-hovorov-v1', 'legacy-untouched');
    writeDraft('owner-a', draft());
    expect(readDraft('owner-a')).toEqual(draft());
    expect(readDraft('owner-b')).toBeNull();
    expect(draftKey('owner-a')).not.toBe(draftKey('owner-b'));
    expect(localStorage.getItem('trener-hovorov-v1')).toBe('legacy-untouched');
  });
  it('does not silently replace a corrupted draft with an empty one', () => {
    localStorage.setItem(draftKey('owner-a'), '{invalid');
    expect(() => readDraft('owner-a')).toThrow();
    expect(localStorage.getItem(draftKey('owner-a'))).toBe('{invalid');
  });
});
