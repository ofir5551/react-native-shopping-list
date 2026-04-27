import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignUpScreen } from './SignUpScreen';
import { useAuth } from '../context/AuthContext';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
      signUp: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
  },
}));

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        text: '#000', textSecondary: '#666', primary: '#007bff',
        background: '#fff', surfaceHighlight: '#f0f0f0', border: '#ccc',
      },
      fonts: {
        regular: 'DMSans_400Regular',
        medium: 'DMSans_500Medium',
        semibold: 'DMSans_600SemiBold',
        bold: 'DMSans_700Bold',
      },
    },
    isDark: false,
  }),
}));

jest.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../i18n/LocaleContext', () => ({ useLocale: () => ({ t: (key: string) => key, isRTL: false }) }));
jest.mock('../styles/appStyles', () => ({
  useAppStyles: () => ({
    container: {}, iconButton: {}, title: {}, nameModalInput: {},
    nameModalError: {}, authButton: {}, authButtonText: {},
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

const mockUseAuth = useAuth as jest.Mock;
const mockAuth = jest.requireMock('../supabase').supabase.auth;

const defaultProps = {
  onBack: jest.fn(),
  onGoToLogin: jest.fn(),
  onSignUpSuccess: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

async function fillAndSubmit(utils: ReturnType<typeof render>) {
  fireEvent.changeText(utils.getByPlaceholderText('signup.namePlaceholder'), 'Test User');
  fireEvent.changeText(utils.getByPlaceholderText('signup.emailPlaceholder'), 'test@example.com');
  fireEvent.changeText(utils.getByPlaceholderText('signup.passwordPlaceholder'), 'password123');
  fireEvent.press(utils.getByText('signup.createAccountButton'));
}

// ─── Core regression: anonymous user ID must be preserved on sign-up ──────────

describe('auth method routing on sign-up', () => {
  it('calls updateUser() (not signUp) when user is anonymous — preserves user ID', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'anon-123', is_anonymous: true } });
    mockAuth.updateUser.mockResolvedValue({ data: { user: { id: 'anon-123' } }, error: null });

    const utils = render(<SignUpScreen {...defaultProps} />);
    await fillAndSubmit(utils);

    await waitFor(() => {
      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        data: { display_name: 'Test User' },
      });
    });
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it('calls signUp() (not updateUser) when there is no session (anonymous sign-in failed)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'new-456' } }, error: null });

    const utils = render(<SignUpScreen {...defaultProps} />);
    await fillAndSubmit(utils);

    await waitFor(() => {
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { data: { display_name: 'Test User' } },
      });
    });
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });

  it('calls onSignUpSuccess after anonymous user is upgraded', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'anon-123', is_anonymous: true } });
    mockAuth.updateUser.mockResolvedValue({ data: { user: { id: 'anon-123' } }, error: null });

    const onSignUpSuccess = jest.fn();
    const utils = render(<SignUpScreen {...defaultProps} onSignUpSuccess={onSignUpSuccess} />);
    await fillAndSubmit(utils);

    await waitFor(() => expect(onSignUpSuccess).toHaveBeenCalled());
  });
});

// ─── Error handling ──────────────────────────────────────────────────────────

describe('error handling', () => {
  it('shows error and does not call onSignUpSuccess when updateUser fails', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'anon-123', is_anonymous: true } });
    mockAuth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    });

    const onSignUpSuccess = jest.fn();
    const utils = render(<SignUpScreen {...defaultProps} onSignUpSuccess={onSignUpSuccess} />);
    await fillAndSubmit(utils);

    await waitFor(() => expect(utils.getByText('Email already registered')).toBeTruthy());
    expect(onSignUpSuccess).not.toHaveBeenCalled();
  });

  it('shows error and does not call onSignUpSuccess when signUp fails', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockAuth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid email' },
    });

    const onSignUpSuccess = jest.fn();
    const utils = render(<SignUpScreen {...defaultProps} onSignUpSuccess={onSignUpSuccess} />);
    await fillAndSubmit(utils);

    await waitFor(() => expect(utils.getByText('Invalid email')).toBeTruthy());
    expect(onSignUpSuccess).not.toHaveBeenCalled();
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe('form validation', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('blocks submit and shows error when name is empty', async () => {
    const utils = render(<SignUpScreen {...defaultProps} />);
    fireEvent.changeText(utils.getByPlaceholderText('signup.emailPlaceholder'), 'a@b.com');
    fireEvent.changeText(utils.getByPlaceholderText('signup.passwordPlaceholder'), 'pass123');
    fireEvent.press(utils.getByText('signup.createAccountButton'));

    expect(utils.getByText('signup.errorName')).toBeTruthy();
    expect(mockAuth.signUp).not.toHaveBeenCalled();
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });

  it('blocks submit and shows error when password is too short', async () => {
    const utils = render(<SignUpScreen {...defaultProps} />);
    fireEvent.changeText(utils.getByPlaceholderText('signup.namePlaceholder'), 'Alice');
    fireEvent.changeText(utils.getByPlaceholderText('signup.emailPlaceholder'), 'a@b.com');
    fireEvent.changeText(utils.getByPlaceholderText('signup.passwordPlaceholder'), 'abc');
    fireEvent.press(utils.getByText('signup.createAccountButton'));

    expect(utils.getByText('signup.errorPasswordLength')).toBeTruthy();
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });
});
