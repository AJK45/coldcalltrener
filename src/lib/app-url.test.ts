import { describe, expect, it } from 'vitest';
import { appUrl } from './app-url';

describe('deployment-aware authentication URLs', () => {
  it('keeps the repository prefix on GitHub project Pages', () => {
    expect(appUrl('/auth/callback', 'https://owner.github.io', '/trener-hovorov/')).toBe('https://owner.github.io/trener-hovorov/auth/callback');
    expect(appUrl('/reset-password', 'https://owner.github.io', '/trener-hovorov/')).toBe('https://owner.github.io/trener-hovorov/reset-password');
  });
  it('supports user Pages and custom domains at the root', () => {
    expect(appUrl('/auth/callback', 'https://owner.github.io', '/')).toBe('https://owner.github.io/auth/callback');
    expect(appUrl('/reset-password', 'https://training.example.com', '/')).toBe('https://training.example.com/reset-password');
  });
  it('keeps local preview callbacks on the current origin', () => {
    expect(appUrl('/auth/callback', 'http://localhost:8080', '/')).toBe('http://localhost:8080/auth/callback');
  });
});
