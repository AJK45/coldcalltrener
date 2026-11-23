import { beforeEach, describe, expect, it, vi } from 'vitest';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
import { CLOUD_MODEL, cloudGenerate, modelName, usesCloudAI } from './cloud-ai';
import { emptyStore, generate, customerSchema, customerFormat } from './trainer';

beforeEach(() => invoke.mockReset());
describe('Predvolený online model', () => {
  it('má Gemini prednastavený bez lokálneho servera', () => {
    expect(modelName(emptyStore().settings)).toBe(CLOUD_MODEL);
    expect(usesCloudAI({ ...emptyStore().settings, provider: undefined, model: '' })).toBe(true);
  });
  it('zachová starší zvolený lokálny model a explicitnú Ollamu', () => {
    expect(usesCloudAI({ ...emptyStore().settings, provider: undefined, model: 'local-model' })).toBe(false);
    expect(usesCloudAI({ ...emptyStore().settings, provider: 'ollama', model: '' })).toBe(false);
  });
  it('posiela kontext serverovej funkcii bez API kľúča v prehliadači', async () => {
    invoke.mockResolvedValue({ data: { result: { text: 'Dobrý deň.', hangup: false } }, error: null });
    expect(await generate(emptyStore().settings, 'systém', 'kontext', customerSchema, customerFormat)).toEqual({ text: 'Dobrý deň.', hangup: false });
    expect(invoke).toHaveBeenCalledWith('trainer-ai', { body: { system: 'systém', prompt: 'kontext', format: customerFormat } });
  });
  it('nepredstiera odpoveď pri chýbajúcom kľúči alebo kvóte', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: 'Chýba GEMINI_API_KEY' }), { status: 503 }) } });
    await expect(cloudGenerate('s', 'p', {})).rejects.toThrow('GEMINI_API_KEY');
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: 'Vyčerpaná kvóta' }), { status: 429 }) } });
    await expect(cloudGenerate('s', 'p', {})).rejects.toThrow('Vyčerpaná kvóta');
  });
  it('overí štruktúru odpovede pred jej použitím', async () => {
    invoke.mockResolvedValue({ data: { result: { text: '' } }, error: null });
    await expect(generate(emptyStore().settings, 's', 'p', customerSchema, customerFormat)).rejects.toThrow('platnú štruktúru');
  });
});
