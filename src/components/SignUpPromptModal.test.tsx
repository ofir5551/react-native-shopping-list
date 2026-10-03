import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SignUpPromptModal } from './SignUpPromptModal';
import { useTheme } from '../context/ThemeContext';
import { useAppStyles } from '../styles/appStyles';
import { useLocale } from '../i18n/LocaleContext';
import { createT } from '../i18n/index';

jest.mock('../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../styles/appStyles', () => ({ useAppStyles: jest.fn() }));
jest.mock('../i18n/LocaleContext', () => ({ useLocale: jest.fn() }));
jest.mock('./GoogleSignInButton', () => {
  const { Text } = require('react-native');
  return {
    GoogleSignInButton: ({ onSuccess }: { onSuccess: () => void }) => (
      <Text onPress={onSuccess}>google-button</Text>
    ),
  };
});

const props = {
  onClose: jest.fn(),
  onEmailSignUp: jest.fn(),
  onSignIn: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({
    theme: {
      colors: { text: '#000', textSecondary: '#666', primary: '#007AFF', primaryText: '#fff', surface: '#fff', border: '#ccc' },
      fonts: { regular: 'r', medium: 'm', semibold: 's', bold: 'b' },
    },
    isDark: false,
  });
  (useAppStyles as jest.Mock).mockReturnValue({
    container: {}, iconButton: {}, title: {}, subtitle: {},
    authButtonSecondary: {}, authButtonTextSecondary: {},
  });
  (useLocale as jest.Mock).mockReturnValue({ t: createT('en'), locale: 'en', isRTL: false, setLocale: jest.fn() });
});

describe('SignUpPromptModal', () => {
  it('renders nothing when there is no reason', () => {
    const { queryByText } = render(<SignUpPromptModal reason={null} {...props} />);
    expect(queryByText('Get more from Shoppy')).toBeNull();
  });

  it('shows the default headline, all benefits and "Continue as guest" on first launch', () => {
    const { getByText } = render(<SignUpPromptModal reason="first" {...props} />);
    expect(getByText('Get more from Shoppy')).toBeTruthy();
    expect(getByText('Never lose a list')).toBeTruthy();
    expect(getByText('Shop together')).toBeTruthy();
    expect(getByText('AI shopping assistant')).toBeTruthy();
    expect(getByText('All your devices')).toBeTruthy();
    expect(getByText('Your current lists come with you')).toBeTruthy();
    expect(getByText('Continue as guest')).toBeTruthy();
  });

  it('shows "Maybe later" for periodic prompts', () => {
    const { getByText, queryByText } = render(<SignUpPromptModal reason="periodic" {...props} />);
    expect(getByText('Maybe later')).toBeTruthy();
    expect(queryByText('Continue as guest')).toBeNull();
  });

  it.each([
    ['ai', 'AI features need a free account', 'Get smart suggestions and turn photos into lists'],
    ['share', 'Share lists with a free account', 'Shop together and see changes live'],
    ['join', 'Join shared lists with a free account', 'Shop together and see changes live'],
  ] as const)('shows the %s headline', (reason, title, subtitle) => {
    const { getByText } = render(<SignUpPromptModal reason={reason} {...props} />);
    expect(getByText(title)).toBeTruthy();
    expect(getByText(subtitle)).toBeTruthy();
  });

  it('wires the actions', () => {
    const { getByText, getByLabelText } = render(<SignUpPromptModal reason="ai" {...props} />);

    fireEvent.press(getByText('Sign up with email'));
    expect(props.onEmailSignUp).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Sign in'));
    expect(props.onSignIn).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Maybe later'));
    fireEvent.press(getByLabelText('Close'));
    fireEvent.press(getByText('google-button'));
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });
});
