import React from 'react';
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
