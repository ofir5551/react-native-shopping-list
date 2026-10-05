import React from 'react';
import { useWindowDimensions } from 'react-native';
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

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (useWindowDimensions as jest.Mock).mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 1 });
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

  it('shows the default headline and all benefits on first launch', () => {
    const { getByText } = render(<SignUpPromptModal reason="first" {...props} />);
    expect(getByText('Get more from Shoppy')).toBeTruthy();
    expect(getByText('Never lose a list')).toBeTruthy();
    expect(getByText('Shop together')).toBeTruthy();
    expect(getByText('AI shopping assistant')).toBeTruthy();
    expect(getByText('All your devices')).toBeTruthy();
    expect(getByText('Your current lists come with you')).toBeTruthy();
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

    fireEvent.press(getByLabelText('Close'));
    fireEvent.press(getByText('google-button'));
    expect(props.onClose).toHaveBeenCalledTimes(2);
    expect(props.onClose).toHaveBeenCalledWith(false);
  });

  it('passes the "don\'t show again" choice when closed from an automatic prompt', () => {
    const { getByText, getByRole, getByLabelText } = render(<SignUpPromptModal reason="periodic" {...props} />);

    expect(getByRole('checkbox').props.accessibilityState).toEqual({ checked: false });
    fireEvent.press(getByText("Don't show this again"));
    expect(getByRole('checkbox').props.accessibilityState).toEqual({ checked: true });

    fireEvent.press(getByLabelText('Close'));
    expect(props.onClose).toHaveBeenCalledWith(true);
  });

  it('closes without opting out when the box is left unticked', () => {
    const { getByLabelText } = render(<SignUpPromptModal reason="first" {...props} />);
    fireEvent.press(getByLabelText('Close'));
    expect(props.onClose).toHaveBeenCalledWith(false);
  });

  it.each(['ai', 'share', 'join'] as const)('hides "don\'t show again" on the %s prompt', (reason) => {
    const { queryByText } = render(<SignUpPromptModal reason={reason} {...props} />);
    expect(queryByText("Don't show this again")).toBeNull();
  });

  it('drops benefit descriptions on short screens to fit without scrolling', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 });
    const { getByText, queryByText } = render(<SignUpPromptModal reason="first" {...props} />);
    expect(getByText('Never lose a list')).toBeTruthy();
    expect(queryByText('Backed up to the cloud')).toBeNull();
  });

  it('shows benefit descriptions on tall screens', () => {
    const { getByText } = render(<SignUpPromptModal reason="first" {...props} />);
    expect(getByText('Backed up to the cloud')).toBeTruthy();
  });
});
