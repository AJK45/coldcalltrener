import { beforeEach, describe, expect, it, vi } from 'vitest';
import { average, duration, loadStore, saveStore, personaSchema, customerSchema, reportSchema, categories, validateEndpoint, models, generate, customerFormat, type Call } from './trainer';

beforeEach(() => {
  vi.unstubAllGlobals();
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
});

describe('Lokálny dátový model', () => {
  it('začína bez vymyslených hovorov alebo podnikania', () => {
    const store = loadStore();
    expect(store.calls).toEqual([]);
    expect(store.businesses).toEqual([]);
    expect(store.settings.consentSpeech).toBe(false);
    expect(store.plan).toBeNull();
  });
  it('uloží a znovu načíta skutočne vložený profil', () => {
    const store = loadStore();
    store.businesses.push({ id: 'test-business', name: 'Testovací profil', industry: '', website: '', description: '', audience: '', usp: '', objections: '', proof: '', process: '', goal: '', knowledge: '' });
    saveStore(store);
    expect(loadStore().businesses[0].name).toBe('Testovací profil');
    expect(loadStore().calls).toHaveLength(0);
  });
  it('uchová prepis rozpracovaného hovoru pri opätovnom načítaní', () => {
    const store = loadStore();
    store.calls.push({ id: 'test-call', status: 'interrupted', turns: [{ id: 't1', role: 'user', text: 'Dobrý deň.', seconds: 4 }] } as Call);
    saveStore(store);
    expect(loadStore().calls[0].turns[0].text).toBe('Dobrý deň.');
    expect(loadStore().calls[0].status).toBe('interrupted');
  });
  it('neprepíše poškodenú zálohu prázdnymi dátami', () => {
    localStorage.setItem('trener-hovorov-v1', '{invalid');
    expect(() => loadStore()).toThrow('Lokálne dáta');
  });
});

describe('Skóre a schémy', () => {
  it('nepočíta chýbajúce hodnotenie ako nulu', () => {
    expect(average({} as Call)).toBeNull();
    expect(average({ report: { scores: [{ score: null }] } } as Call)).toBeNull();
  });
  it('priemeruje iba hodnotiteľné kategórie', () => {
    expect(average({ report: { scores: [{ score: 80 }, { score: null }, { score: 61 }] } } as Call)).toBe(71);
  });
  it('formátuje čas bez vymysleného merania', () => {
    expect(duration(0)).toBe('00:00');
    expect(duration(125)).toBe('02:05');
  });
  it('odmieta neúplnú personu a neplatnú zákaznícku odpoveď', () => {
    expect(personaSchema.safeParse({ name: 'Ján' }).success).toBe(false);
    expect(customerSchema.safeParse({ text: '', hangup: false }).success).toBe(false);
    expect(customerSchema.safeParse({ text: 'Dobrý deň.', hangup: false }).success).toBe(true);
  });
  it('vyžaduje 15 skóre, tri priority a hodnoty v rozsahu', () => {
    const report = { scores: categories.map(category => ({ category, score: 50, evidence: 'citácia', explanation: 'vysvetlenie', better: 'lepšia odpoveď', exercise: 'cvičenie' })), summary: 'Súhrn', outcome: 'Bez dohody', priorities: ['A', 'B', 'C'], strengths: [], missed: [] };
    expect(reportSchema.safeParse(report).success).toBe(true);
    expect(reportSchema.safeParse({ ...report, scores: report.scores.slice(1) }).success).toBe(false);
    expect(reportSchema.safeParse({ ...report, scores: report.scores.map(s => ({ ...s, score: 101 })) }).success).toBe(false);
  });
});

describe('Lokálny poskytovateľ a zlyhania', () => {
  it('odmieta vzdialené servery a prihlasovacie údaje v URL', () => {
    expect(() => validateEndpoint('https://example.com')).toThrow();
    expect(() => validateEndpoint('http://user:secret@localhost:11434')).toThrow();
    expect(() => validateEndpoint('javascript:alert(1)')).toThrow();
    expect(validateEndpoint('http://192.168.1.10:11434')).toBe('http://192.168.1.10:11434');
  });
  it('načíta reálny zoznam modelov zo štruktúrovanej odpovede servera', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'test-model' }] }))));
    expect(await models(loadStore().settings)).toEqual(['test-model']);
  });
  it('pri chybe poskytovateľa nevymyslí úspešnú odpoveď a umožní nový pokus', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response('error', { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ message: { content: JSON.stringify({ text: 'Dobrý deň.', hangup: false }) } })));
    vi.stubGlobal('fetch', request);
    const settings = { ...loadStore().settings, model: 'test-model' };
    await expect(generate(settings, 'systém', 'otázka', customerSchema, customerFormat)).rejects.toThrow('503');
    expect(await generate(settings, 'systém', 'otázka', customerSchema, customerFormat)).toEqual({ text: 'Dobrý deň.', hangup: false });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('odmieta chybný JSON namiesto ukladania náhradnej odpovede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: { content: 'nie je JSON' } }))));
    await expect(generate({ ...loadStore().settings, model: 'test-model' }, 'systém', 'otázka', customerSchema, customerFormat)).rejects.toThrow('platnú štruktúru');
  });
});
