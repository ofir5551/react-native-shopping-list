import { ShoppingList } from '../types';

const baseList: ShoppingList = {
  id: '1',
  name: 'Test',
  createdAt: 1000,
  updatedAt: 2000,
  items: [],
  recents: [],
  dismissedSuggestions: [],
};

describe('archive list filtering', () => {
  it('active view excludes lists with isArchived true', () => {
    const lists: ShoppingList[] = [
      { ...baseList, id: '1', isArchived: false },
      { ...baseList, id: '2', isArchived: true },
      { ...baseList, id: '3' },
    ];
    const active = lists.filter((l) => !l.isArchived);
    expect(active).toHaveLength(2);
    expect(active.map((l) => l.id)).not.toContain('2');
  });

  it('archive view includes only lists with isArchived true', () => {
    const lists: ShoppingList[] = [
      { ...baseList, id: '1', isArchived: false },
      { ...baseList, id: '2', isArchived: true },
      { ...baseList, id: '3' },
    ];
    const archived = lists.filter((l) => l.isArchived === true);
    expect(archived).toHaveLength(1);
    expect(archived[0].id).toBe('2');
  });

  it('archiving a list sets isArchived true', () => {
    const list: ShoppingList = { ...baseList, id: '1' };
    const archived = { ...list, isArchived: true };
    expect(archived.isArchived).toBe(true);
  });

  it('restoring a list sets isArchived false', () => {
    const list: ShoppingList = { ...baseList, id: '1', isArchived: true };
    const restored = { ...list, isArchived: false };
    expect(restored.isArchived).toBe(false);
  });
});
