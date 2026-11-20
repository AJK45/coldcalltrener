// @vitest-environment jsdom
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { type Session } from '@supabase/supabase-js';
import { RequireOwner, SessionContextProvider } from './SessionContext';

const api = vi.hoisted(() => ({ getSession: vi.fn(), listen: vi.fn(), unsubscribe: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), from: vi.fn(), signOut: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: api.getSession, onAuthStateChange: api.listen, signOut: api.signOut }, from: api.from } }));
const session = (id = 'owner-test', token = 'test-token'): Session => ({ access_token: token, refresh_token: 'test-only', expires_in: 3600, token_type: 'bearer', user: { id, email: `${id}@example.test` } } as Session);
let onChange: (event: string, next: Session | null) => void;
let mounts = 0;
function Protected() { useEffect(() => { mounts++; }, []); return <div>Private workspace</div>; }
function renderApp() {
  return render(<MemoryRouter initialEntries={['/']}><SessionContextProvider><Routes><Route path="/prihlasenie" element={<div>Login screen</div>}/><Route path="/reset-password" element={<div>Password recovery</div>}/><Route element={<RequireOwner/>}><Route path="/" element={<Protected/>}/></Route></Routes></SessionContextProvider></MemoryRouter>);
}
beforeEach(() => {
  sessionStorage.clear(); vi.clearAllMocks(); mounts = 0;
  api.listen.mockImplementation(callback => { onChange = callback; return { data: { subscription: { unsubscribe: api.unsubscribe } } }; });
  api.getSession.mockResolvedValue({ data: { session: null }, error: null });
  api.from.mockReturnValue({ select: api.select }); api.select.mockReturnValue({ eq: api.eq }); api.eq.mockReturnValue({ maybeSingle: api.maybeSingle });
  api.maybeSingle.mockResolvedValue({ data: { user_id: 'owner-test' }, error: null });
  api.signOut.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe('Private session routing with mocked auth and owner queries', () => {
  it('redirects unauthenticated visitors without mounting private data', async () => {
    renderApp(); await screen.findByText('Login screen');
    expect(mounts).toBe(0); expect(api.from).not.toHaveBeenCalled();
  });
  it('requires a positive owner authorization before rendering the workspace', async () => {
    api.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    renderApp(); await screen.findByText('Private workspace');
    expect(api.from).toHaveBeenCalledWith('private_owner');
    expect(api.eq).toHaveBeenCalledWith('user_id', 'owner-test');
  });
  it('denies a signed-in but unapproved account', async () => {
    api.getSession.mockResolvedValue({ data: { session: session('not-owner') }, error: null });
    api.maybeSingle.mockResolvedValue({ data: null, error: null });
    renderApp(); await screen.findByText('Tento účet ešte nemá povolený prístup');
    expect(mounts).toBe(0);
  });
  it('fails closed when owner authorization cannot be read', async () => {
    api.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    api.maybeSingle.mockResolvedValue({ data: null, error: { message: 'test error' } });
    renderApp(); await screen.findByText('Overenie prístupu zlyhalo');
    expect(mounts).toBe(0);
  });
  it('does not reuse one account approval for a newly signed-in account', async () => {
    api.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    renderApp(); await screen.findByText('Private workspace');
    api.maybeSingle.mockResolvedValue({ data: null, error: null });
    await act(async () => { onChange('SIGNED_IN', session('other-account')); });
    await screen.findByText('Tento účet ešte nemá povolený prístup');
    expect(screen.queryByText('Private workspace')).toBeNull();
    expect(mounts).toBe(1);
  });
  it('does not interrupt the workspace on same-user token refresh', async () => {
    api.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    renderApp(); await screen.findByText('Private workspace');
    await act(async () => { onChange('TOKEN_REFRESHED', session('owner-test', 'refreshed-test-token')); });
    await waitFor(() => expect(api.maybeSingle).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Private workspace')).not.toBeNull(); expect(mounts).toBe(1);
  });
  it('routes recovery events to password update before ordinary signed-in navigation', async () => {
    api.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    renderApp(); await screen.findByText('Private workspace');
    await act(async () => { onChange('PASSWORD_RECOVERY', session()); });
    await screen.findByText('Password recovery');
    expect(sessionStorage.getItem('trener-password-recovery')).toBe('1');
  });
  it('clears recovery and removes private screens on sign-out', async () => {
    api.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    renderApp(); await screen.findByText('Private workspace');
    await act(async () => { onChange('SIGNED_OUT', null); });
    await screen.findByText('Login screen');
    expect(sessionStorage.getItem('trener-password-recovery')).toBeNull();
  });
});
