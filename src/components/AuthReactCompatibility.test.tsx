// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Auth } from '@supabase/auth-ui-react';
import { createClient } from '@supabase/supabase-js';

const client = createClient('https://example.supabase.co', 'test-only-publishable-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

afterEach(cleanup);

describe('Real Supabase Auth UI React compatibility', () => {
  it('renders the actual hook-using sign-in component with the app React renderer', () => {
    render(
      <Auth
        supabaseClient={client}
        view="sign_in"
        providers={[]}
        showLinks={false}
        redirectTo="https://example.test/auth/callback"
        localization={{ variables: { sign_in: {
          email_label: 'E-mail',
          password_label: 'Heslo',
          button_label: 'Prihlásiť sa',
        } } }}
      />,
    );
    expect(screen.getByLabelText('E-mail').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Heslo').getAttribute('type')).toBe('password');
    expect(screen.getByRole('button', { name: 'Prihlásiť sa' })).toBeTruthy();
  });
});
