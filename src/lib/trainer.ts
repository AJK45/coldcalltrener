import { z } from 'zod';
import { cloudGenerate, usesCloudAI } from './cloud-ai';

export const intents = ['Úplne studený hovor', 'Lead z kontaktného formulára', 'Lead z reklamy', 'Stiahnutý lead magnet', 'Spätný hovor', 'Nadviazanie na rozhovor', 'Po odoslaní ponuky', 'Dohodnutie konzultácie', 'Potvrdenie stretnutia', 'Prichádzajúci záujemca', 'Upsell existujúcemu zákazníkovi', 'Reaktivácia zákazníka', 'Otázka na cenu', 'Porovnávanie konkurencie', 'Uzavretie predaja', 'Vlastný scenár'];
export const modes = ['Štandardný hovor', 'Tréning námietok', 'Úvod hovoru', 'Odhaľovanie potrieb', 'Uzavretie hovoru', 'Pod tlakom', 'Náhodný hovor', 'Adaptívny tréning', 'Opakovanie hovoru', 'Referenčný tréning'];
export const categories = ['Úvod a prvý dojem', 'Vzťah a dôvera', 'Zrozumiteľnosť vyjadrovania', 'Odhaľovanie potrieb', 'Aktívne počúvanie', 'Pochopenie zákazníka', 'Hodnotová ponuka', 'Personalizácia', 'Zvládanie námietok', 'Kvalita argumentov', 'Práca s cenou', 'Vedenie rozhovoru', 'Dohodnutie ďalšieho kroku', 'Profesionalita', 'Efektivita hovoru'];
export const presets = [
  ['Skeptický riaditeľ', 'Studený hovor rozhodovateľovi, ktorý očakáva konkrétny dôvod.', 7, 3, 'Rozhodovateľ'],
  ['Cez recepciu ďalej', 'Asistent odmieta prepojiť hovor. Získajte dôveru, nie skratku.', 6, 4, 'Asistent'],
  ['Zaneprázdnený podnikateľ', 'Má plný deň. Rešpektujte jeho čas a pomenujte hodnotu.', 6, 6, 'Majiteľ'],
  ['Záujemca z formulára', 'Už prejavil záujem. Zistite, čo ho priviedlo k vašej ponuke.', 3, 2, 'Teplý lead'],
  ['Pošlite mi e-mail', 'Skutočný záujem alebo zdvorilé odmietnutie? Zistite rozdiel.', 5, 3, 'Námietka'],
  ['Nemám čas', 'Získajte priestor na jednu dobrú otázku.', 6, 6, 'Námietka'],
  ['Je to drahé', 'Preskúmajte hodnotu a očakávania pred zľavou.', 6, 3, 'Cena'],
  ['Už máme agentúru', 'Rešpektujte existujúceho dodávateľa a odhaľte príležitosť.', 7, 3, 'Konkurencia'],
  ['Nemáme rozpočet', 'Odhaľte, či ide o načasovanie, prioritu alebo hodnotu.', 6, 3, 'Cena'],
  ['Nemáme záujem', 'Zvládnite odmietnutie bez zbytočného tlaku.', 7, 5, 'Námietka'],
  ['Ukážte mi výsledky', 'Zákazník žiada dôkazy. Nevymýšľajte referencie.', 7, 3, 'Dôvera'],
  ['Chcem zľavu', 'Vyjednávajte s ohľadom na potvrdené podmienky.', 6, 4, 'Cena'],
  ['Neverím predajcom', 'Dôveru musíte získať, nie si ju vypýtať.', 8, 6, 'Dôvera'],
  ['Porovnávam ponuky', 'Pomôžte zákazníkovi zvoliť relevantné kritériá.', 7, 3, 'Konkurencia'],
  ['Musím sa poradiť', 'Zmapujte rozhodovací proces a dohodnite ďalší krok.', 5, 2, 'Rozhodovanie'],
  ['Zhovorčivý zákazník', 'Počúvajte, no udržte rozhovor pri cieli.', 5, 2, 'Osobnosť'],
  ['Tichý zákazník', 'Otvorenými otázkami vytvorte bezpečný priestor.', 6, 3, 'Osobnosť'],
  ['Náročný, ale milý', 'Príjemný rozhovor neznamená jednoduchý predaj.', 9, 1, 'Výzva'],
  ['Jednoduchý, ale hrubý', 'Reálna potreba a nepríjemný tón. Zachovajte pokoj.', 3, 9, 'Výzva'],
] as const;
export type Business = { id: string; name: string; industry: string; website: string; description: string; audience: string; usp: string; objections: string; proof: string; process: string; goal: string; knowledge: string };
export type Product = { id: string; businessId: string; name: string; description: string; price: string; known: string; private: string };
export type Settings = { provider?: 'gemini' | 'ollama'; endpoint: string; model: string; consentSpeech: boolean; voice: string; rate: number; tested: boolean; testedModel: string; theme: 'dark' | 'light'; weeklyGoal: number };
export type CallConfig = { businessId: string; productId: string; intent: string; mode: string; difficulty: number; rudeness: number; goal: string; context: string; preset: string };
export const personaSchema = z.object({ name: z.string().min(2), role: z.string(), company: z.string(), background: z.string(), privatePersona: z.string(), opening: z.string() });
export type Persona = z.infer<typeof personaSchema>;
export type Turn = { id: string; role: 'user' | 'assistant'; text: string; seconds: number };
const scoreSchema = z.object({ category: z.enum(categories as [string, ...string[]]), score: z.number().min(0).max(100).nullable(), evidence: z.string(), explanation: z.string(), better: z.string(), exercise: z.string() });
export const reportSchema = z.object({ scores: z.array(scoreSchema).length(15), summary: z.string(), outcome: z.enum(['Stretnutie dohodnuté', 'Predaj dohodnutý v simulácii', 'Vyžiadaný ďalší kontakt', 'Zamietnuté', 'Bez dohody']), priorities: z.array(z.string()).length(3), strengths: z.array(z.string()), missed: z.array(z.string()) });
export type Report = z.infer<typeof reportSchema>;
export type Call = { id: string; created: string; duration: number; config: CallConfig; persona: Persona; businessName: string; productName: string; turns: Turn[]; status: 'active' | 'completed' | 'interrupted'; report?: Report; model: string; rubric: string; error?: string };
export type Store = { businesses: Business[]; products: Product[]; calls: Call[]; settings: Settings; plan: { text: string; created: string; model: string } | null };
const initial: Store = { businesses: [], products: [], calls: [], settings: { provider: 'gemini', endpoint: 'http://localhost:11434', model: 'gemini-2.5-flash', consentSpeech: false, voice: '', rate: 1, tested: false, testedModel: '', theme: 'dark', weeklyGoal: 3 }, plan: null };
export function emptyStore(): Store { return structuredClone(initial); }
const KEY = 'trener-hovorov-v1';
export function loadStore(): Store { const saved = localStorage.getItem(KEY); if (!saved) return structuredClone(initial); try { const data = JSON.parse(saved); return { ...initial, ...data, settings: { ...initial.settings, ...data.settings } }; } catch { throw new Error('Lokálne dáta sa nepodarilo načítať. Nemažte úložisko; najprv si vytvorte zálohu.'); } }
export function saveStore(store: Store) { localStorage.setItem(KEY, JSON.stringify(store)); }
export function average(call: Call) { const scores = call.report?.scores.filter(s => s.score !== null) ?? []; return scores.length ? Math.round(scores.reduce((a, s) => a + s.score!, 0) / scores.length) : null; }
export function adjustedScore(raw: number, difficulty: number) { return Math.max(0, Math.min(100, raw + 2 * (difficulty - 5))); }
export function duration(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }
export function download(name: string, content: string, type = 'application/json') { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function validateEndpoint(value: string) { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Zadajte iba adresu servera, napr. http://localhost:11434.'); const h = url.hostname; if (!(h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h))) throw new Error('Tento konektor povoľuje iba lokálny server alebo súkromnú sieť.'); return url.origin; }
async function requestLocal(url: string, init: RequestInit) {
  try { return await fetch(url, init); }
  catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw new Error('Vypršal čas čakania na lokálny model. Skúste menší model alebo požiadavku zopakujte.');
    throw new Error('Spojenie s Ollama zlyhalo. Skontrolujte adresu, spustený server, povolený pôvod a obmedzenia lokálnej siete v prehliadači.');
  }
}
export async function models(settings: Settings) {
  const res = await requestLocal(`${validateEndpoint(settings.endpoint)}/api/tags`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error('Ollama neodpovedá. Skontrolujte server a povolenie pôvodu aplikácie.');
  try { const data = await res.json(); return z.object({ models: z.array(z.object({ name: z.string() })) }).parse(data).models.map(m => m.name); }
  catch { throw new Error('Server nevrátil platný zoznam modelov Ollama. Overte adresu a verziu servera.'); }
}
export async function generate<T>(settings: Settings, system: string, prompt: string, schema: z.ZodType<T>, format: object): Promise<T> {
  if (usesCloudAI(settings)) {
    const result = await cloudGenerate(system, prompt, format);
    const parsed = schema.safeParse(result);
    if (!parsed.success) throw new Error('Model nevrátil platnú štruktúru odpovede. Dáta zostali uložené; skúste požiadavku zopakovať.');
    return parsed.data;
  }
  if (!settings.model) throw new Error('Najprv vyberte model v nastaveniach.');
  const res = await requestLocal(`${validateEndpoint(settings.endpoint)}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: settings.model, stream: false, format, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], options: { temperature: 0.6, num_ctx: 8192 } }), signal: AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`Lokálny model vrátil chybu ${res.status}. Skontrolujte Ollama a dostupnú pamäť.`);
  try { const data = await res.json(); return schema.parse(JSON.parse(data.message.content)); }
  catch { throw new Error('Model nevrátil platnú štruktúru odpovede. Dáta zostali uložené; skúste požiadavku zopakovať.'); }
}
export const personaFormat = { type: 'object', properties: Object.fromEntries(['name', 'role', 'company', 'background', 'privatePersona', 'opening'].map(k => [k, { type: 'string' }])), required: ['name', 'role', 'company', 'background', 'privatePersona', 'opening'] };
export const customerSchema = z.object({ text: z.string().min(1).max(4000), hangup: z.boolean() });
export const customerFormat = { type: 'object', properties: { text: { type: 'string' }, hangup: { type: 'boolean' } }, required: ['text', 'hangup'] };
export const reportFormat = { type: 'object', properties: { scores: { type: 'array', minItems: 15, maxItems: 15, items: { type: 'object', properties: { category: { type: 'string', enum: categories }, score: { type: ['number', 'null'] }, ...Object.fromEntries(['evidence', 'explanation', 'better', 'exercise'].map(k => [k, { type: 'string' }])) }, required: ['category', 'score', 'evidence', 'explanation', 'better', 'exercise'] } }, summary: { type: 'string' }, outcome: { type: 'string', enum: ['Stretnutie dohodnuté', 'Predaj dohodnutý v simulácii', 'Vyžiadaný ďalší kontakt', 'Zamietnuté', 'Bez dohody'] }, priorities: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } }, strengths: { type: 'array', items: { type: 'string' } }, missed: { type: 'array', items: { type: 'string' } } }, required: ['scores', 'summary', 'outcome', 'priorities', 'strengths', 'missed'] };
