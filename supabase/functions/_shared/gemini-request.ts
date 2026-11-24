export async function requestGemini(
  url: string,
  init: RequestInit,
  request: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
): Promise<{ response: Response; attempts: number }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await request(url, init);
    if (response.status !== 503 || attempt === 3) return { response, attempts: attempt };
    await response.body?.cancel();
    console.warn('[trainer-ai] Google returned 503; retrying same model', { attempt, nextAttempt: attempt + 1 });
    await wait(attempt === 1 ? 1000 : 3000);
    init.signal?.throwIfAborted();
  }
  throw new Error('Unreachable retry state');
}
