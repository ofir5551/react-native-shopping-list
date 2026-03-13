import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SyncProvider, useSync } from './SyncContext';
import { useAuth } from './AuthContext';
import { SyncEngine } from '../sync/SyncEngine';
import { LocalStorageProvider } from '../storage';

jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../sync/SyncEngine');
jest.mock('../sync/SupabaseApiClient', () => ({
  SupabaseApiClient: jest.fn(),
}));
jest.mock('../storage', () => ({
  LocalStorageProvider: {
    loadLists: jest.fn().mockResolvedValue([]),
    saveLists: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const MockSyncEngine = SyncEngine as jest.MockedClass<typeof SyncEngine>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncProvider>{children}</SyncProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  // Default SyncEngine mock: start resolves, stop is a no-op
  MockSyncEngine.prototype.start = jest.fn().mockResolvedValue(undefined);
  MockSyncEngine.prototype.stop = jest.fn();
  MockSyncEngine.prototype.onLocalSave = jest.fn().mockResolvedValue(undefined);
  MockSyncEngine.prototype.joinList = jest.fn().mockResolvedValue(undefined);
  MockSyncEngine.prototype.leaveList = jest.fn().mockResolvedValue(undefined);
  MockSyncEngine.prototype.deleteList = jest.fn().mockResolvedValue(undefined);
  (LocalStorageProvider.loadLists as jest.Mock).mockResolvedValue([]);
  (LocalStorageProvider.saveLists as jest.Mock).mockResolvedValue(undefined);
});

// ─── Guest mode ──────────────────────────────────────────────────────────────

describe('Guest mode (user=null)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
  });

  it('isInitializing becomes false immediately (no SyncEngine created)', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));
    expect(MockSyncEngine).not.toHaveBeenCalled();
  });

  it('joinList throws "signed in" error', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await expect(result.current.joinList('CODE')).rejects.toThrow(/signed in/i);
  });

  it('leaveList throws "online" error', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await expect(result.current.leaveList('list1')).rejects.toThrow(/online/i);
  });

  it('deleteListFromServer is a no-op (no error)', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await expect(result.current.deleteListFromServer('list1')).resolves.not.toThrow();
  });

  it('storageProvider.loadLists reads from LocalStorageProvider', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await result.current.storageProvider.loadLists();
    expect(LocalStorageProvider.loadLists).toHaveBeenCalled();
  });
});

// ─── Authenticated mode ───────────────────────────────────────────────────────

describe('Authenticated mode (user present)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });
  });

  it('creates and starts SyncEngine', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(MockSyncEngine).toHaveBeenCalled();
    expect(MockSyncEngine.prototype.start).toHaveBeenCalled();
  });

  it('isInitializing becomes false after engine.start() resolves', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));
  });

  it('isInitializing becomes false even when engine.start() fails', async () => {
    MockSyncEngine.prototype.start = jest.fn().mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));
  });

  it('storageProvider.saveLists writes to local AND calls syncEngine.onLocalSave', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    const lists = [{ id: 'l1', name: 'Groceries', createdAt: 0, updatedAt: 0, items: [], recents: [] }];
    await result.current.storageProvider.saveLists(lists);

    expect(LocalStorageProvider.saveLists).toHaveBeenCalledWith(lists);
    expect(MockSyncEngine.prototype.onLocalSave).toHaveBeenCalledWith(lists);
  });

  it('joinList delegates to SyncEngine', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await result.current.joinList('SHARE1');
    expect(MockSyncEngine.prototype.joinList).toHaveBeenCalledWith('SHARE1');
  });

  it('leaveList delegates to SyncEngine', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await result.current.leaveList('list1');
    expect(MockSyncEngine.prototype.leaveList).toHaveBeenCalledWith('list1');
  });

  it('deleteListFromServer delegates to SyncEngine', async () => {
    const { result } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await result.current.deleteListFromServer('list1');
    expect(MockSyncEngine.prototype.deleteList).toHaveBeenCalledWith('list1');
  });

  it('stops SyncEngine on unmount', async () => {
    const { result, unmount } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    unmount();
    expect(MockSyncEngine.prototype.stop).toHaveBeenCalled();
  });
});

// ─── Auth state transition ────────────────────────────────────────────────────

describe('Auth state transition', () => {
  it('stops SyncEngine when user signs out', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, isLoading: false });

    const { result, rerender } = renderHook(() => useSync(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(MockSyncEngine.prototype.start).toHaveBeenCalledTimes(1);

    // Simulate sign-out
    act(() => {
      mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    });
    rerender({});

    await waitFor(() => {
      expect(MockSyncEngine.prototype.stop).toHaveBeenCalled();
    });
  });
});
