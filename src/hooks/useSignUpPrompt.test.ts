import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../context/AuthContext';
import { isPeriodicPromptDue, useSignUpPrompt } from './useSignUpPrompt';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const KEY = '@shopping-list/signup-prompt-shown-at';
const OPTED_OUT_KEY = '@shopping-list/signup-prompt-opted-out';
const mockUseAuth = useAuth as jest.Mock;
const guest = { user: { id: 'anon-1', is_anonymous: true } };
const registered = { user: { id: 'user-1', is_anonymous: false } };

// Let pending AsyncStorage promises and state updates settle.
const flush = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

describe('isPeriodicPromptDue', () => {
  const now = 100 * DAY;

  it('is due when never shown', () => {
    expect(isPeriodicPromptDue(null, now)).toBe(true);
  });

  it('is not due one minute before 3 days', () => {
    expect(isPeriodicPromptDue(now - 3 * DAY + 60_000, now)).toBe(false);
  });

  it('is due at exactly 3 days', () => {
    expect(isPeriodicPromptDue(now - 3 * DAY, now)).toBe(true);
  });

  it('is due well after 3 days', () => {
    expect(isPeriodicPromptDue(now - 30 * DAY, now)).toBe(true);
  });

  it('is due when last shown is in the future (clock moved back)', () => {
    expect(isPeriodicPromptDue(now + DAY, now)).toBe(true);
  });
});

describe('useSignUpPrompt', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(guest);
  });

  it('shows the first-launch prompt to a new guest and records the time', async () => {
    const { result } = renderHook(() => useSignUpPrompt(true));

    await waitFor(() => expect(result.current.reason).toBe('first'));
    expect(Number(await AsyncStorage.getItem(KEY))).toBeGreaterThan(0);
  });

  it('shows the periodic prompt when last shown 3+ days ago', async () => {
    await AsyncStorage.setItem(KEY, String(Date.now() - 4 * DAY));
    const { result } = renderHook(() => useSignUpPrompt(true));

    await waitFor(() => expect(result.current.reason).toBe('periodic'));
  });

  it('does not show when last shown 1 day ago', async () => {
    await AsyncStorage.setItem(KEY, String(Date.now() - DAY));
    const { result } = renderHook(() => useSignUpPrompt(true));

    await flush();
    expect(result.current.reason).toBeNull();
  });

  it('never shows to registered users', async () => {
    mockUseAuth.mockReturnValue(registered);
    const { result } = renderHook(() => useSignUpPrompt(true));

    await flush();
    expect(result.current.reason).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('never shows when there is no user (offline first launch)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useSignUpPrompt(true));

    await flush();
    expect(result.current.reason).toBeNull();
  });

  it('waits for hydration', async () => {
    const { result } = renderHook(() => useSignUpPrompt(false));

    await flush();
    expect(result.current.reason).toBeNull();
  });

  it('treats a corrupted stored value as never shown', async () => {
    await AsyncStorage.setItem(KEY, 'garbage');
    const { result } = renderHook(() => useSignUpPrompt(true));

    await waitFor(() => expect(result.current.reason).toBe('first'));
  });

  it('still shows when storage read fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk error'));
    const { result } = renderHook(() => useSignUpPrompt(true));

    await waitFor(() => expect(result.current.reason).toBe('first'));
  });

  it('opens for a feature reason and dismisses', async () => {
    await AsyncStorage.setItem(KEY, String(Date.now() - DAY));
    const { result } = renderHook(() => useSignUpPrompt(true));
    await flush();

    act(() => result.current.promptSignUp('ai'));
    expect(result.current.reason).toBe('ai');

    act(() => result.current.dismiss());
    expect(result.current.reason).toBeNull();
  });

  it('does not record a time for feature prompts', async () => {
    const stored = String(Date.now() - DAY);
    await AsyncStorage.setItem(KEY, stored);
    const { result } = renderHook(() => useSignUpPrompt(true));
    await flush();

    act(() => result.current.promptSignUp('share'));
    await flush();
    expect(await AsyncStorage.getItem(KEY)).toBe(stored);
  });

  it('keeps an open feature prompt when the periodic check fires', async () => {
    const stored = String(Date.now() - 4 * DAY);
    await AsyncStorage.setItem(KEY, stored);
    const { result } = renderHook(() => useSignUpPrompt(true));

    // Open a feature prompt before the periodic check's storage read resolves.
    act(() => result.current.promptSignUp('join'));
    await flush();

    expect(result.current.reason).toBe('join');
    expect(await AsyncStorage.getItem(KEY)).toBe(stored);
  });

  it('closes the prompt when the guest signs in', async () => {
    const { result, rerender } = renderHook(() => useSignUpPrompt(true));
    await waitFor(() => expect(result.current.reason).toBe('first'));

    mockUseAuth.mockReturnValue(registered);
    rerender({});

    expect(result.current.reason).toBeNull();
  });

  it('remembers "don\'t show again" and skips automatic prompts afterwards', async () => {
    const { result, unmount } = renderHook(() => useSignUpPrompt(true));
    await waitFor(() => expect(result.current.reason).toBe('first'));

    act(() => result.current.dismiss(true));
    await flush();
    expect(await AsyncStorage.getItem(OPTED_OUT_KEY)).toBe('true');
    unmount();

    // Even long after the 3-day interval, the opted-out guest is not prompted.
    await AsyncStorage.setItem(KEY, String(Date.now() - 30 * DAY));
    const next = renderHook(() => useSignUpPrompt(true));
    await flush();
    expect(next.result.current.reason).toBeNull();
  });

  it('does not opt out on a plain dismiss', async () => {
    const { result } = renderHook(() => useSignUpPrompt(true));
    await waitFor(() => expect(result.current.reason).toBe('first'));

    act(() => result.current.dismiss());
    await flush();
    expect(await AsyncStorage.getItem(OPTED_OUT_KEY)).toBeNull();
  });

  it('still opens feature prompts after opting out', async () => {
    await AsyncStorage.setItem(OPTED_OUT_KEY, 'true');
    const { result } = renderHook(() => useSignUpPrompt(true));
    await flush();
    expect(result.current.reason).toBeNull();

    act(() => result.current.promptSignUp('ai'));
    expect(result.current.reason).toBe('ai');
  });
});
