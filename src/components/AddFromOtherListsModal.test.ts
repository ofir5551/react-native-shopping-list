import { buildCandidates } from './AddFromOtherListsModal';
import type { ShoppingItem, ShoppingList } from '../types';

const makeItem = (id: string, name: string, purchased = false, quantity = 1): ShoppingItem => ({
  id,
  name,
  purchased,
  quantity,
  createdAt: 1000,
});

const makeList = (id: string, name: string, items: ShoppingItem[], updatedAt = 1000): ShoppingList => ({
  id,
  name,
  items,
  createdAt: 1000,
  updatedAt,
  recents: [],
  dismissedSuggestions: [],
});

describe('buildCandidates', () => {
  it('returns items from other lists', () => {
    const current = makeList('l1', 'Current', []);
    const other = makeList('l2', 'Other', [makeItem('i1', 'Milk')]);
    const sections = buildCandidates('l1', [], [current, other]);
    expect(sections).toHaveLength(1);
    expect(sections[0].data[0].name).toBe('Milk');
  });

  it('excludes the current list', () => {
    const current = makeList('l1', 'Current', [makeItem('i1', 'Milk')]);
    const sections = buildCandidates('l1', [makeItem('i1', 'Milk')], [current]);
    expect(sections).toHaveLength(0);
  });

  it('excludes purchased items from other lists', () => {
    const current = makeList('l1', 'Current', []);
    const other = makeList('l2', 'Other', [makeItem('i1', 'Milk', true)]);
    const sections = buildCandidates('l1', [], [current, other]);
    expect(sections).toHaveLength(0);
  });

  it('excludes items already active in current list', () => {
    const current = makeList('l1', 'Current', [makeItem('i1', 'Milk', false)]);
    const other = makeList('l2', 'Other', [makeItem('i2', 'Milk', false)]);
    const sections = buildCandidates('l1', current.items, [current, other]);
    expect(sections).toHaveLength(0);
  });

  it('does not exclude items that are only completed in current list', () => {
    const current = makeList('l1', 'Current', [makeItem('i1', 'Milk', true)]);
    const other = makeList('l2', 'Other', [makeItem('i2', 'Milk', false)]);
    const sections = buildCandidates('l1', current.items, [current, other]);
    expect(sections).toHaveLength(1);
    expect(sections[0].data[0].name).toBe('Milk');
  });

  it('deduplicates same name across lists — most recently updated list wins', () => {
    const current = makeList('l1', 'Current', []);
    const older = makeList('l2', 'Older', [makeItem('i1', 'Milk', false, 1)], 1000);
    const newer = makeList('l3', 'Newer', [makeItem('i2', 'Milk', false, 3)], 2000);
    const sections = buildCandidates('l1', [], [current, older, newer]);

    const all = sections.flatMap((s) => s.data);
    expect(all).toHaveLength(1);
    expect(all[0].quantity).toBe(3);
  });

  it('older duplicate does not appear as a separate entry', () => {
    const current = makeList('l1', 'Current', []);
    const older = makeList('l2', 'Older', [makeItem('i1', 'Milk', false, 1)], 1000);
    const newer = makeList('l3', 'Newer', [makeItem('i2', 'Milk', false, 3)], 2000);
    const sections = buildCandidates('l1', [], [current, older, newer]);

    const listNames = sections.map((s) => s.listName);
    expect(listNames).not.toContain('Older');
  });

  it('returns empty array when no eligible items exist', () => {
    const current = makeList('l1', 'Current', []);
    const other = makeList('l2', 'Other', [makeItem('i1', 'Milk', true)]);
    const sections = buildCandidates('l1', [], [current, other]);
    expect(sections).toHaveLength(0);
  });

  it('carries quantity from source item', () => {
    const current = makeList('l1', 'Current', []);
    const other = makeList('l2', 'Other', [makeItem('i1', 'Eggs', false, 6)]);
    const sections = buildCandidates('l1', [], [current, other]);
    expect(sections[0].data[0].quantity).toBe(6);
  });

  it('is case-insensitive for deduplication with active current items', () => {
    const current = makeList('l1', 'Current', [makeItem('i1', 'MILK', false)]);
    const other = makeList('l2', 'Other', [makeItem('i2', 'milk', false)]);
    const sections = buildCandidates('l1', current.items, [current, other]);
    expect(sections).toHaveLength(0);
  });

  it('sections are ordered by most recently updated list first', () => {
    const current = makeList('l1', 'Current', []);
    const older = makeList('l2', 'Old List', [makeItem('i1', 'Apples')], 1000);
    const newer = makeList('l3', 'New List', [makeItem('i2', 'Bananas')], 2000);
    const sections = buildCandidates('l1', [], [current, older, newer]);
    expect(sections[0].listName).toBe('New List');
    expect(sections[1].listName).toBe('Old List');
  });
});
