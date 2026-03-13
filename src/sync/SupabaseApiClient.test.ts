import { SupabaseApiClient } from './SupabaseApiClient';
import { supabase } from '../supabase';
import { ShoppingList } from '../types';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const USER_ID = 'user-abc';

function makeList(overrides: Partial<ShoppingList> & Pick<ShoppingList, 'id'>): ShoppingList {
  return {
    name: 'Test List',
    createdAt: 1000,
    updatedAt: 2000,
    items: [],
    recents: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── fetchLists ──────────────────────────────────────────────────────────────

describe('fetchLists', () => {
  it('returns parsed lists from Supabase', async () => {
    const row = {
      id: 'list1',
      name: 'Groceries',
      created_at: 1000,
      updated_at: 2000,
      items: [],
      recents: [],
      user_id: USER_ID,
      share_code: 'ABCD',
    };
    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [row], error: null }),
    });

    const client = new SupabaseApiClient(USER_ID);
    const lists = await client.fetchLists();

    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({
      id: 'list1',
      name: 'Groceries',
      ownerId: USER_ID,
      shareCode: 'ABCD',
    });
  });

  it('throws when Supabase returns an error', async () => {
    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
    });

    const client = new SupabaseApiClient(USER_ID);
    await expect(client.fetchLists()).rejects.toThrow();
  });
});

// ─── upsertList ──────────────────────────────────────────────────────────────

describe('upsertList', () => {
  it('uses upsert for an owned list', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    (mockSupabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });

    const client = new SupabaseApiClient(USER_ID);
    const list = makeList({ id: 'l1', ownerId: USER_ID });
    await client.upsertList(list);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'l1', user_id: USER_ID }),
      expect.any(Object),
    );
  });

  it('uses update for a shared (non-owned) list', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (mockSupabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const client = new SupabaseApiClient(USER_ID);
    const list = makeList({ id: 'l1', ownerId: 'other-user' });
    await client.upsertList(list);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ items: [], recents: [] }),
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'l1');
  });

  it('throws when upsert returns an error', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: new Error('conflict') });
    (mockSupabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });

    const client = new SupabaseApiClient(USER_ID);
    await expect(client.upsertList(makeList({ id: 'l1', ownerId: USER_ID }))).rejects.toThrow();
  });
});

// ─── deleteList ───────────────────────────────────────────────────────────────

describe('deleteList', () => {
  it('calls delete with correct filters', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ error: null });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
    (mockSupabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

    const client = new SupabaseApiClient(USER_ID);
    await client.deleteList('list1');

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq1).toHaveBeenCalledWith('id', 'list1');
    expect(mockEq2).toHaveBeenCalledWith('user_id', USER_ID);
  });

  it('throws when Supabase returns an error', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ error: new Error('not found') });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
    (mockSupabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

    const client = new SupabaseApiClient(USER_ID);
    await expect(client.deleteList('list1')).rejects.toThrow();
  });
});

// ─── joinList ────────────────────────────────────────────────────────────────

describe('joinList', () => {
  it('looks up share code and inserts list_shares row', async () => {
    (mockSupabase.rpc as jest.Mock).mockResolvedValue({ data: 'list-id-xyz', error: null });
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    (mockSupabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const client = new SupabaseApiClient(USER_ID);
    await client.joinList('SHARE1');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_list_id_by_share_code', {
      p_share_code: 'SHARE1',
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ list_id: 'list-id-xyz', user_id: USER_ID }),
    );
  });

  it('throws when share code is not found', async () => {
    (mockSupabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

    const client = new SupabaseApiClient(USER_ID);
    await expect(client.joinList('BADCODE')).rejects.toThrow(/No list found/);
  });

  it('throws duplicate error when already joined', async () => {
    (mockSupabase.rpc as jest.Mock).mockResolvedValue({ data: 'list-id-xyz', error: null });
    const mockInsert = jest.fn().mockResolvedValue({ error: { code: '23505' } });
    (mockSupabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const client = new SupabaseApiClient(USER_ID);
    await expect(client.joinList('SHARE1')).rejects.toThrow(/already joined/);
  });
});

// ─── leaveList ────────────────────────────────────────────────────────────────

describe('leaveList', () => {
  it('deletes the list_shares row', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ error: null });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
    (mockSupabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

    const client = new SupabaseApiClient(USER_ID);
    await client.leaveList('list1');

    expect(mockEq1).toHaveBeenCalledWith('list_id', 'list1');
    expect(mockEq2).toHaveBeenCalledWith('user_id', USER_ID);
  });

  it('throws when Supabase returns an error', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ error: new Error('fail') });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    (mockSupabase.from as jest.Mock).mockReturnValue({
      delete: jest.fn().mockReturnValue({ eq: mockEq1 }),
    });

    const client = new SupabaseApiClient(USER_ID);
    await expect(client.leaveList('list1')).rejects.toThrow(/Failed to leave/);
  });
});
