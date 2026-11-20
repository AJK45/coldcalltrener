// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TrainerProvider, useTrainer } from './TrainerProvider';
import { emptyStore, type Business } from '@/lib/trainer';
import { readDraft, toCloudData, writeDraft, type CloudData, type Workspace } from '@/lib/cloud-store';

const api = vi.hoisted(() => ({ fetch: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/workspace-api', () => ({ fetchWorkspace: api.fetch, saveWorkspace: api.save }));
vi.mock('./SessionContext', () => ({ useSession: () => ({ session: { user: { id: 'owner-test' } } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const business = (id: string): Business => ({ id, name: id, industry: '', website: '', description: '', audience: '', usp: '', objections: '', proof: '', process: '', goal: '', knowledge: '' });
const data = () => toCloudData(emptyStore());
function Probe() {
  const { store, update, syncStatus, revision, saveNow } = useTrainer();
  return <div><span data-testid="status">{syncStatus}</span><span data-testid="revision">{revision}</span><span data-testid="count">{store.businesses.length}</span><button onClick={() => update(s => ({ ...s, businesses: [...s.businesses, business(`profile-${s.businesses.length + 1}`)] }))}>Add</button><button onClick={() => void saveNow()}>Save</button><button onClick={() => update(s => ({ ...s, settings: { ...s.settings, theme: 'light' } }))}>Theme</button></div>;
}
async function start() { render(<TrainerProvider><Probe/></TrainerProvider>); await screen.findByTestId('status'); }

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  api.fetch.mockResolvedValue({ revision: 0, data: data() });
  api.save.mockImplementation(async (revision: number, payload: CloudData) => ({ revision: revision + 1, data: payload }));
});
afterEach(cleanup);

describe('Mounted synchronization provider with mocked server', () => {
  it('does not automatically upload legacy browser data', async () => {
    localStorage.setItem('trener-hovorov-v1', JSON.stringify({ ...emptyStore(), businesses: [business('legacy')] }));
    await start();
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(api.save).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('trener-hovorov-v1')!).businesses).toHaveLength(1);
  });
  it('durably saves a local edit before the network request and acknowledges its revision', async () => {
    await start(); fireEvent.click(screen.getByText('Add'));
    expect(readDraft('owner-test')!.data.businesses).toHaveLength(1);
    expect(screen.getByTestId('status').textContent).toBe('pending');
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('saved'));
    expect(screen.getByTestId('revision').textContent).toBe('1');
    expect(readDraft('owner-test')!.base.businesses).toHaveLength(1);
  });
  it('retains unsent changes when disconnected and sends them on explicit retry', async () => {
    api.save.mockRejectedValueOnce(new Error('Test connection failure'));
    await start(); fireEvent.click(screen.getByText('Add')); fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('offline'));
    expect(readDraft('owner-test')!.data.businesses).toHaveLength(1);
    expect(readDraft('owner-test')!.base.businesses).toHaveLength(0);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('saved'));
    expect(api.save).toHaveBeenCalledTimes(2);
  });
  it('does not lose an edit made while a previous revision is being saved', async () => {
    let acknowledge: (value: Workspace) => void;
    api.save.mockImplementationOnce(() => new Promise<Workspace>(resolve => { acknowledge = resolve; }));
    await start(); fireEvent.click(screen.getByText('Add')); fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('saving'));
    const submitted = api.save.mock.calls[0][1] as CloudData;
    fireEvent.click(screen.getByText('Add'));
    await act(async () => { acknowledge({ revision: 1, data: submitted }); });
    expect(screen.getByTestId('status').textContent).toBe('pending');
    expect(readDraft('owner-test')!.base.businesses).toHaveLength(1);
    expect(readDraft('owner-test')!.data.businesses).toHaveLength(2);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('saved'));
    expect(api.save.mock.calls[1][0]).toBe(1);
    expect(api.save.mock.calls[1][1].businesses).toHaveLength(2);
  });
  it('blocks stale-device writes and preserves the conflicted local draft', async () => {
    api.save.mockResolvedValueOnce(null);
    await start(); fireEvent.click(screen.getByText('Add')); fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Zastavili sme konflikt medzi zariadeniami');
    expect(readDraft('owner-test')!.data.businesses).toHaveLength(1);
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('count')).toBeNull();
  });
  it('does not upload device-only settings', async () => {
    await start(); fireEvent.click(screen.getByText('Theme'));
    expect(readDraft('owner-test')!.settings.theme).toBe('light');
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('saved'));
    expect(api.save).not.toHaveBeenCalled();
  });
  it('stops at a conflict found during initial load rather than uploading it', async () => {
    writeDraft('owner-test', { revision: 1, base: data(), data: { ...data(), businesses: [business('local')] }, settings: emptyStore().settings });
    api.fetch.mockResolvedValue({ revision: 2, data: { ...data(), businesses: [business('remote')] } });
    render(<TrainerProvider><Probe/></TrainerProvider>);
    await screen.findByText('Zastavili sme konflikt medzi zariadeniami');
    expect(readDraft('owner-test')!.data.businesses[0].id).toBe('local');
    expect(api.save).not.toHaveBeenCalled();
  });
});
