import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

const mockAuth = (supabase as any).auth;

const fakeSession = {
  user: { id: 'user-1', email: 'test@example.com' },
  access_token: 'token',
};

function makeSubscription() {
  return { data: { subscription: { unsubscribe: jest.fn() } } };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  // Default: onAuthStateChange returns a subscription and never fires
  mockAuth.onAuthStateChange.mockReturnValue(makeSubscription());
});

describe('AuthContext', () => {
  it('starts with isLoading=true, user=null, session=null', () => {
    // getSession never resolves during this synchronous check
    mockAuth.getSession.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('populates user and session after getSession resolves with a session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(fakeSession.user);
    expect(result.current.session).toEqual(fakeSession);
  });

  it('sets user=null and isLoading=false when getSession returns null session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
  });

  it('sets isLoading=false and user=null when getSession rejects (offline)', async () => {
    mockAuth.getSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
  });

  it('updates user reactively when onAuthStateChange fires', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });

    let stateChangeCallback: (event: string, session: any) => void = () => {};
    mockAuth.onAuthStateChange.mockImplementation((cb: any) => {
      stateChangeCallback = cb;
      return makeSubscription();
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();

    act(() => {
      stateChangeCallback('SIGNED_IN', fakeSession);
    });

    await waitFor(() => expect(result.current.user).toEqual(fakeSession.user));
    expect(result.current.session).toEqual(fakeSession);
  });

  it('calls subscription.unsubscribe on unmount', async () => {
    const unsubscribeSpy = jest.fn();
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeSpy } },
    });

    const { unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {});

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
