import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return reply(405, { error: 'Nepovolená metóda.' });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Prihláste sa znova.' });
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !user) return reply(401, { error: 'Prihláste sa znova.' });
    const { data: owner, error: ownerError } = await client.from('private_owner').select('user_id').eq('user_id', user.id).maybeSingle();
    if (ownerError || !owner) return reply(403, { error: 'Účet nemá schválený prístup.' });
    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return reply(503, { error: 'Gemini je predvolený, ale ešte chýba serverový kľúč. V Supabase → Edge Functions → Secrets pridajte GEMINI_API_KEY z Google AI Studio. Kľúč nevkladajte do aplikácie ani do chatu.' });
    if (Number(req.headers.get('content-length') || 0) > 250000) return reply(413, { error: 'Kontext je príliš dlhý.' });
    const raw = await req.text();
    if (raw.length > 250000) return reply(413, { error: 'Kontext je príliš dlhý.' });
    let body;
    try { body = JSON.parse(raw); } catch { return reply(400, { error: 'Neplatná požiadavka.' }); }
    if (typeof body.system !== 'string' || !body.system || body.system.length > 30000 || typeof body.prompt !== 'string' || body.prompt.length > 180000 || !body.format || typeof body.format !== 'object' || Array.isArray(body.format) || JSON.stringify(body.format).length > 20000) return reply(400, { error: 'Neplatný alebo príliš dlhý kontext.' });
    const model = Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-3.8-flash';
    if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) return reply(503, { error: 'Serverové nastavenie GEMINI_MODEL musí obsahovať iba názov modelu, napríklad gemini-3.8-flash, nie URL.' });
    console.info('[trainer-ai] Generating response', { model });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: body.system }] }, contents: [{ role: 'user', parts: [{ text: body.prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 16384, responseMimeType: 'application/json', responseJsonSchema: body.format } }),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      let providerMessage = '';
      let providerStatus = '';
      try {
        const failure = await response.json();
        if (typeof failure.error?.message === 'string') providerMessage = failure.error.message.split(key).join('[skrytý kľúč]').replace(/AIza[A-Za-z0-9_-]+/g, '[skrytý kľúč]').slice(0, 2000);
        if (typeof failure.error?.status === 'string') providerStatus = failure.error.status.replace(/[^A-Z_]/g, '').slice(0, 80);
      } catch { /* Google or an intermediary may return a non-JSON error page. */ }
      // Do not log provider messages: they can quote private request content.
      console.warn('[trainer-ai] Provider rejected request', { status: response.status, model, providerStatus });
      const detail = providerMessage ? ` Google: ${providerMessage}` : ' Google neposkytol podrobnú JSON chybu.';
      if (response.status === 404) {
        let available: string[] = [];
        try {
          const listing = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(15000) });
          if (listing.ok) {
            const catalog = await listing.json();
            available = (Array.isArray(catalog.models) ? catalog.models : [])
              .filter((item: { name?: string; supportedGenerationMethods?: string[] }) => typeof item.name === 'string' && item.name.startsWith('models/gemini-') && item.supportedGenerationMethods?.includes('generateContent'))
              .map((item: { name: string }) => item.name.replace('models/', ''));
            console.info('[trainer-ai] Available generation models', { models: available });
          } else console.warn('[trainer-ai] Model listing failed', { status: listing.status });
        } catch { console.warn('[trainer-ai] Model listing unavailable'); }
        const listed = available.includes(model);
        const explanation = listed
          ? `Model ${model} je v zozname Google, ale generovanie vrátilo HTTP 404. Nejde teda o potvrdený neexistujúci názov modelu.`
          : available.length
            ? `Generovanie modelom ${model} vrátilo HTTP 404 a tento model nie je v načítanom zozname. Dostupné názvy: ${available.slice(0, 20).join(', ')}.`
            : `Generovanie modelom ${model} vrátilo HTTP 404. Zoznam modelov sa nepodarilo overiť.`;
        return reply(502, { error: `${explanation}${detail} Model ani fakturácia sa automaticky nezmenili.` });
      }
      const explanation = response.status === 429 ? 'Gemini dosiahol limit požiadaviek alebo dostupnú kvótu. Bezplatný limit nie je neobmedzený.' : response.status === 400 || response.status === 403 ? 'Google odmietol požiadavku. Treba overiť podrobný dôvod, nie automaticky meniť model alebo zapínať fakturáciu.' : `Generovanie Gemini zlyhalo (HTTP ${response.status}).`;
      return reply(response.status === 429 ? 429 : 502, { error: `${explanation}${detail}` });
    }
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason !== 'STOP') return reply(502, { error: 'Gemini nedokončil odpoveď. Skúste kratší kontext alebo požiadavku zopakujte.' });
    const text = candidate.content?.parts?.filter((part: { thought?: boolean; text?: string }) => !part.thought && typeof part.text === 'string').map((part: { text: string }) => part.text).join('');
    try {
      const result = JSON.parse(text);
      console.info('[trainer-ai] Response completed');
      return reply(200, { result });
    } catch { return reply(502, { error: 'Gemini nevrátil platnú štruktúru odpovede. Skúste znova.' }); }
  } catch (error) {
    console.error('[trainer-ai] Request failed', { name: error instanceof Error ? error.name : 'Unknown' });
    return reply(502, { error: 'Spojenie s AI zlyhalo alebo vypršal čas čakania. Dáta zostali uložené; skúste znova.' });
  }
});
