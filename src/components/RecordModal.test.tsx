import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { RecordModal } from './RecordModal';
import { useTheme } from '../context/ThemeContext';
import { useAppStyles } from '../styles/appStyles';
import { useLocale } from '../i18n/LocaleContext';
import { usePreferences } from '../context/PreferencesContext';
import { createT, Locale } from '../i18n/index';

const mockListeners: Record<string, (event?: any) => void> = {};
const mockSpeech = {
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  isRecognitionAvailable: jest.fn(() => true),
  addListener: jest.fn((name: string, listener: (event?: any) => void) => {
    mockListeners[name] = listener;
    return { remove: jest.fn() };
  }),
  start: jest.fn(),
  stop: jest.fn(),
};

jest.mock('expo-speech-recognition', () => ({ ExpoSpeechRecognitionModule: mockSpeech }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));
jest.mock('../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../styles/appStyles', () => ({ useAppStyles: jest.fn() }));
jest.mock('../i18n/LocaleContext', () => ({ useLocale: jest.fn() }));
jest.mock('../context/PreferencesContext', () => ({ usePreferences: jest.fn() }));

const t = createT('en');

const setup = (locale: Locale = 'en') => {
  (useLocale as jest.Mock).mockReturnValue({ t: createT(locale), locale, isRTL: locale === 'he', setLocale: jest.fn() });
  const onAdd = jest.fn();
  const utils = render(
    <RecordModal visible onClose={jest.fn()} onAdd={onAdd} vocabulary={['Milk', 'Eggs', 'Bread']} />
  );
  return { ...utils, onAdd };
};

const waitForStart = (times: number) => waitFor(() => expect(mockSpeech.start).toHaveBeenCalledTimes(times));

const speak = (transcript: string, isFinal = true) =>
  act(() => mockListeners.result({ isFinal, results: [{ transcript }] }));

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({
    theme: {
      colors: {
        text: '#000', textSecondary: '#666', primary: '#007AFF', primaryText: '#fff', surfaceHighlight: '#eee',
        border: '#ccc', danger: '#f00', inputBackground: '#fff',
      },
      fonts: { regular: 'r', medium: 'm', semibold: 's', bold: 'b' },
    },
  });
  (useAppStyles as jest.Mock).mockReturnValue({});
  (usePreferences as jest.Mock).mockReturnValue({
    preferences: { parserDevMode: false, silenceCompleteMs: 500, silencePossiblyCompleteMs: 300 },
  });
});

describe('RecordModal', () => {
  it('listens in the app language and biases recognition toward known items', async () => {
    setup('he');
    await waitForStart(1);
    const options = mockSpeech.start.mock.calls[0][0];
    expect(options.lang).toBe('he-IL');
    expect(options.continuous).toBe(true);
    expect(options.contextualStrings).toEqual(expect.arrayContaining(['Milk', 'חלב']));
  });

  it('switches the recognition language from the toggle', async () => {
    const { getByText } = setup('he');
    await waitForStart(1);

    fireEvent.press(getByText(t('voiceRecord.langEn')));
    expect(mockSpeech.stop).toHaveBeenCalled();
    act(() => mockListeners.end());

    await waitForStart(2);
    expect(mockSpeech.start.mock.calls[1][0].lang).toBe('en-US');
  });

  it('turns speech into chips and restarts when the session ends on its own', async () => {
    const { getByText } = setup();
    await waitForStart(1);

    speak('I need milk and 2 eggs');
    expect(getByText('milk')).toBeTruthy();
    expect(getByText('2× eggs')).toBeTruthy();

    act(() => mockListeners.end());
    await waitForStart(2);
  });

  it('splits run-on speech using the vocabulary and handles voice removal', async () => {
    const { getByText, queryByText } = setup();
    await waitForStart(1);

    speak('milk eggs bread');
    expect(getByText('eggs')).toBeTruthy();
    speak('remove the eggs');
    expect(queryByText('eggs')).toBeNull();
    expect(getByText('Add 2 Items')).toBeTruthy();
  });

  it('re-adds an item said again after its chip was removed', async () => {
    const { getByLabelText, getByText, queryByText } = setup();
    await waitForStart(1);

    speak('milk, eggs');
    fireEvent.press(getByLabelText(t('voiceRecord.removeItem', { name: 'milk' })));
    expect(queryByText('milk')).toBeNull();

    speak('milk');
    expect(getByText('milk')).toBeTruthy();
  });

  it('keeps a removed chip removed while the same phrase keeps growing (iOS interim results)', async () => {
    const { getByLabelText, getByText, queryByText } = setup();
    await waitForStart(1);

    speak('milk and eggs', false);
    fireEvent.press(getByLabelText(t('voiceRecord.removeItem', { name: 'eggs' })));
    speak('milk and eggs and bread', false);
    speak('milk and eggs and bread', true);

    expect(queryByText('eggs')).toBeNull();
    expect(getByText('milk')).toBeTruthy();
    expect(getByText('bread')).toBeTruthy();
  });

  it('keeps a removed chip removed when the recognizer revises the phrase', async () => {
    const { getByLabelText, getByText, queryByText } = setup();
    await waitForStart(1);

    speak('milk and eggs', false);
    fireEvent.press(getByLabelText(t('voiceRecord.removeItem', { name: 'eggs' })));
    speak('Milk, eggs and bread', false);
    expect(queryByText('eggs')).toBeNull();
    speak('Milk, eggs and bread', true);

    expect(queryByText('eggs')).toBeNull();
    expect(getByText('milk')).toBeTruthy();
    expect(getByText('bread')).toBeTruthy();
  });

  it('parses a phrase finalized after a language switch in the language it was spoken in', async () => {
    const { getByText } = setup('en');
    await waitForStart(1);

    speak('two', false);
    fireEvent.press(getByText(t('voiceRecord.langHe')));
    speak('two milk', true);
    act(() => mockListeners.end());

    expect(getByText('2× milk')).toBeTruthy();
    await waitForStart(2);
    expect(mockSpeech.start.mock.calls[1][0].lang).toBe('he-IL');
  });

  it('accepts a deliberate repeat after a pause', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      const { getByText } = setup();
      await waitForStart(1);

      speak('milk, eggs');
      speak('undo');
      now.mockReturnValue(1_003_000);
      speak('undo');
      expect(getByText(t('voiceRecord.noItems'))).toBeTruthy();
    } finally {
      now.mockRestore();
    }
  });

  it('uses the latest translations in listeners registered on an earlier render', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { rerender } = setup('en');
    await waitForStart(1);

    (useLocale as jest.Mock).mockReturnValue({ t: createT('he'), locale: 'he', isRTL: true, setLocale: jest.fn() });
    rerender(<RecordModal visible onClose={jest.fn()} onAdd={jest.fn()} vocabulary={[]} />);
    act(() => mockListeners.error({ error: 'not-allowed', message: '' }));

    expect(alert.mock.calls[0][0]).toBe(createT('he')('voiceRecord.permDeniedTitle'));
    alert.mockRestore();
  });

  it('starts listening when reopened while the first permission request is still pending', async () => {
    const resolvers: ((value: { granted: boolean }) => void)[] = [];
    const pending = () => new Promise<{ granted: boolean }>((resolve) => resolvers.push(resolve));
    mockSpeech.requestPermissionsAsync.mockImplementationOnce(pending).mockImplementationOnce(pending);
    const modal = (visible: boolean) => (
      <RecordModal visible={visible} onClose={jest.fn()} onAdd={jest.fn()} vocabulary={[]} />
    );
    (useLocale as jest.Mock).mockReturnValue({ t, locale: 'en', isRTL: false, setLocale: jest.fn() });

    const { rerender } = render(modal(true));
    rerender(modal(false));
    rerender(modal(true));
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await act(async () => resolvers.forEach((resolve) => resolve({ granted: true })));

    await waitForStart(1);
  });

  it('ignores a duplicated closing result', async () => {
    const { getByText, onAdd } = setup();
    await waitForStart(1);

    speak('2 milk');
    speak('2 milk');
    fireEvent.press(getByText('Add 1 Item'));
    expect(onAdd).toHaveBeenCalledWith([{ name: 'milk', quantity: 2 }]);
  });

  it('shows a clear message when the language is not installed', async () => {
    const { getByText } = setup('he');
    await waitForStart(1);

    act(() => mockListeners.error({ error: 'language-not-supported', message: '' }));
    act(() => mockListeners.end());

    expect(getByText(createT('he')('voiceRecord.errorLanguage'))).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(mockSpeech.start).toHaveBeenCalledTimes(1);
  });

  it('stays quiet on a no-speech timeout and keeps listening', async () => {
    const { queryByText } = setup();
    await waitForStart(1);

    act(() => mockListeners.error({ error: 'no-speech', message: '' }));
    act(() => mockListeners.end());

    await waitForStart(2);
    expect(queryByText(t('voiceRecord.errorGeneric'))).toBeNull();
  });
});
