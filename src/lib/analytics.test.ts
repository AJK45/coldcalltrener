import { describe, expect, it } from 'vitest';
import { adjustedScore } from './trainer';

describe('Transparentná experimentálna úprava skóre', () => {
  it('pri referenčnej náročnosti nemení surové skóre', () => {
    expect(adjustedScore(73, 5)).toBe(73);
  });
  it('používa presne dva body za stupeň náročnosti od päť', () => {
    expect(adjustedScore(70, 8)).toBe(76);
    expect(adjustedScore(70, 2)).toBe(64);
  });
  it('neprekročí hranice nula až sto', () => {
    expect(adjustedScore(98, 10)).toBe(100);
    expect(adjustedScore(2, 1)).toBe(0);
  });
});
