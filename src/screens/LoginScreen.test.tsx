import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';
import { supabase } from '../supabase';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useAppStyles } from '../styles/appStyles';
import { useLocale } from '../i18n/LocaleContext';
import { createT } from '../i18n/index';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

jest.mock('../context/ToastContext', () => ({
  useToast: jest.fn(),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../styles/appStyles', () => ({
  useAppStyles: jest.fn(),
}));

jest.mock('../i18n/LocaleContext', () => ({
  useLocale: jest.fn(),
}));

// expo-status-bar and vector icons are mocked globally in jest.setup.js

const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
const mockShowToast = jest.fn();

const mockTheme = {
  theme: {
    colors: {
      text: '#000',
      primary: '#007AFF',
      surface: '#fff',
      border: '#ccc',
      textSecondary: '#666',
    },
  },
  isDark: false,
};

const mockStyles = {
  container: {},
  iconButton: {},
  title: {},
  subtitle: {},
  authButtonSecondary: {},
  authButtonTextSecondary: {},
  nameModalInput: {},
  nameModalError: {},
  authButton: {},
  authButtonText: {},
};

const mockT = createT('en');

beforeEach(() => {
  jest.clearAllMocks();
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useTheme as jest.Mock).mockReturnValue(mockTheme);
  (useAppStyles as jest.Mock).mockReturnValue(mockStyles);
  (useLocale as jest.Mock).mockReturnValue({ t: mockT, locale: 'en', isRTL: false, setLocale: jest.fn() });
});

const defaultProps = {
  onBack: jest.fn(),
  onGoToSignup: jest.fn(),
  onLoginSuccess: jest.fn(),
};

function renderExpanded() {
  return render(<LoginScreen {...defaultProps} />);
}

// ─── Validation tests ─────────────────────────────────────────────────────────

describe('LoginScreen validation', () => {
  it('shows email error when email is empty', async () => {
    const { getByText } = renderExpanded();

    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Please enter your email.')).toBeTruthy();
    });
  });

  it('shows password error when password is empty', async () => {
    const { getByText, getByPlaceholderText } = renderExpanded();

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Please enter your password.')).toBeTruthy();
    });
  });

  it('shows general error when Supabase returns an error', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const { getByText, getByPlaceholderText } = renderExpanded();

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'wrongpassword');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Invalid login credentials')).toBeTruthy();
    });
  });

  it('calls onLoginSuccess and shows toast on successful sign-in', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const onLoginSuccess = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen {...defaultProps} onLoginSuccess={onLoginSuccess} />,
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'correctpassword');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Signed in successfully!');
    });
  });

  it('calls supabase.auth.signInWithPassword with trimmed email', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const { getByText, getByPlaceholderText } = renderExpanded();

    fireEvent.changeText(getByPlaceholderText('you@example.com'), '  user@example.com  ');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  });
});
