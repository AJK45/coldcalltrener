import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyStore } from './trainer';
import { toCloudData } from './cloud-store';

const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), abortRead: vi.fn(), maybeSingle: vi.fn(), rpc: vi.fn(), abortWrite: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
import { fetchWorkspace, saveWorkspace } from './workspace-api';

const payload = () => toCloudData(emptyStore());
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ abortSignal: mocks.abortRead });
  mocks.abortRead.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.rpc.mockReturnValue({ abortSignal: mocks.abortWrite });
  mocks.abortWrite.mockResolvedValue({ data: [{ revision: 1, payload: payload() }], error: null });
});

describe('Workspace API with mocked Supabase responses', () => {
  it('uses the account ID and returns revision zero only for an absent workspace', async () => {
    expect(await fetchWorkspace('owner-test', payload())).toEqual({ revision: 0, data: payload() });
    expect(mocks.from).toHaveBeenCalledWith('training_workspace');
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'owner-test');
  });
  it('parses an existing workspace without inventing records', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { revision: 4, payload: payload() }, error: null });
    expect(await fetchWorkspace('owner-test', payload())).toEqual({ revision: 4, data: payload() });
  });
  it('does not treat a read failure as an empty database', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'test network failure' } });
    await expect(fetchWorkspace('owner-test', payload())).rejects.toThrow('načítať');
  });
  it('rejects a malformed remote payload rather than overwriting it', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { revision: 2, payload: { version: 9 } }, error: null });
    await expect(fetchWorkspace('owner-test', payload())).rejects.toThrow('nepodporovaný formát');
  });
  it('writes only through the atomic RPC with the exact expected revision', async () => {
    mocks.abortWrite.mockResolvedValue({ data: [{ revision: 5, payload: payload() }], error: null });
    expect(await saveWorkspace(4, payload())).toEqual({ revision: 5, data: payload() });
    expect(mocks.rpc).toHaveBeenCalledWith('save_training_workspace', { expected_revision: 4, new_payload: payload() });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('returns a conflict instead of retrying with an unconditional overwrite', async () => {
    mocks.abortWrite.mockResolvedValue({ data: [], error: null });
    expect(await saveWorkspace(4, payload())).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('preserves an error when a write is denied or disconnected', async () => {
    mocks.abortWrite.mockResolvedValue({ data: null, error: { code: '42501' } });
    await expect(saveWorkspace(0, payload())).rejects.toThrow('Lokálny koncept zostáva zachovaný');
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('rejects missing or invalid write acknowledgements', async () => {
    mocks.abortWrite.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: [{ revision: 0, payload: payload() }], error: null });
    await expect(saveWorkspace(0, payload())).rejects.toThrow('potvrdenie');
    await expect(saveWorkspace(0, payload())).rejects.toThrow('formát');
  });
});
