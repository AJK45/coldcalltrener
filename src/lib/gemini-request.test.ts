import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestGemini } from '../../supabase/functions/_shared/gemini-request';

afterEach(() => vi.restoreAllMocks());

describe('Gemini bounded 503 retries', () => {
  it('returns successful responses without retrying', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'));
    const wait = vi.fn().mockResolvedValue(undefined);
    const result = await requestGemini('https://example.com', { method: 'POST' }, request, wait);
    expect(result.attempts).toBe(1);
    expect(result.response.ok).toBe(true);
    expect(wait).not.toHaveBeenCalled();
  });

  it('retries 503 with the same URL, payload and shared deadline', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}'));
    const wait = vi.fn().mockResolvedValue(undefined);
    const init = { method: 'POST', body: '{"prompt":"test"}', signal: new AbortController().signal };
    const result = await requestGemini('https://example.com/same-model', init, request, wait);
    expect(result.attempts).toBe(3);
    expect(result.response.ok).toBe(true);
    expect(wait.mock.calls).toEqual([[1000], [3000]]);
    for (const call of request.mock.calls) expect(call).toEqual(['https://example.com/same-model', init]);
  });

  it('stops after three explicit 503 responses and preserves the final error body', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response('still unavailable', { status: 503 }));
    const result = await requestGemini('https://example.com', {}, request, vi.fn().mockResolvedValue(undefined));
    expect(request).toHaveBeenCalledTimes(3);
    expect(result.attempts).toBe(3);
    expect(await result.response.text()).toBe('still unavailable');
  });

  it.each([400, 401, 403, 404, 429, 500])('does not retry HTTP %s', async status => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('error', { status }));
    const result = await requestGemini('https://example.com', {}, request, vi.fn());
    expect(result.attempts).toBe(1);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not retry ambiguous network failures', async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Network error'));
    await expect(requestGemini('https://example.com', {}, request, vi.fn())).rejects.toThrow('Network error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('stops if the shared signal expires during the delay', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('busy', { status: 503 }));
    const wait = vi.fn().mockImplementation(async () => controller.abort());
    await expect(requestGemini('https://example.com', { signal: controller.signal }, request, wait)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
