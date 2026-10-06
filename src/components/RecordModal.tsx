import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { createT, Locale, TranslationKey } from '../i18n/index';
import { usePreferences } from '../context/PreferencesContext';
import { useAppStyles } from '../styles/appStyles';
import { POPULAR_ITEMS } from '../data/popularItems';
import { applyCommands, matchKey, parseCommands, ParsedItem, VoiceCommand } from '../utils/itemParser';

const SILENCE_TIMEOUT_MS = 15000;
const SILENCE_CHECK_INTERVAL_MS = 500;
// Android ends continuous sessions after a pause; restart them transparently
const RESTART_DELAY_MS = 250;
const QUICK_END_MS = 1000;
const MAX_QUICK_RESTARTS = 3;
const MAX_CONTEXTUAL_STRINGS = 100;

const SPEECH_LOCALES: Locale[] = ['en', 'he'];
const SPEECH_LANG: Record<Locale, string> = { en: 'en-US', he: 'he-IL' };
const LOCALE_LABEL_KEYS: Record<Locale, TranslationKey> = { en: 'voiceRecord.langEn', he: 'voiceRecord.langHe' };
// Errors that only end the current session — the auto-restart picks up from there
const TRANSIENT_ERRORS = new Set(['no-speech', 'speech-timeout', 'aborted', 'busy', 'client']);
const ERROR_KEYS: Record<string, TranslationKey> = {
  'language-not-supported': 'voiceRecord.errorLanguage',
  network: 'voiceRecord.errorNetwork',
};

// expo-speech-recognition requires a dev build — not available in Expo Go.
// Required lazily so a missing native module is caught here instead of crashing on load.
let expoSpeechModule: any = null;
function getExpoSpeechModule() {
  if (expoSpeechModule) return expoSpeechModule;
  try {
    const mod = require('expo-speech-recognition');
    // Verify the native module is actually linked (not just JS shim)
    if (!mod.ExpoSpeechRecognitionModule?.requestPermissionsAsync) return null;
    expoSpeechModule = mod;
    return expoSpeechModule;
  } catch {
    return null;
  }
}

// Each spoken phrase keeps the language it was spoken in, so switching language mid-recording
// doesn't re-parse earlier phrases with the wrong lexicon
type Segment = { kind: 'speech'; text: string; locale: Locale } | { kind: 'remove'; name: string };

function mergeVocabulary(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const entry of lists.flat()) {
    const key = entry.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(entry.trim());
  }
  return merged;
}

type RecordModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (items: ParsedItem[]) => void;
  /** Known item names (recents, list items) — used to split run-on speech and bias recognition */
  vocabulary: string[];
};

export const RecordModal = ({ visible, onClose, onAdd, vocabulary }: RecordModalProps) => {
  const { theme } = useTheme();
  const { t, locale } = useLocale();
  const { preferences } = usePreferences();
  const styles = useAppStyles();
  const [useTextFallback, setUseTextFallback] = useState(false);
  const showTextInput = preferences.parserDevMode || useTextFallback;

  const [speechLocale, setSpeechLocale] = useState<Locale>(locale);
  const [isActive, setIsActive] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interim, setInterim] = useState('');
  const [devInput, setDevInput] = useState('');
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const speechModuleRef = useRef<any>(null);
  const subscriptionsRef = useRef<{ remove: () => void }[]>([]);
  // Bumped on every open/close so async work from a previous opening bails out
  const generationRef = useRef(0);
  const isStartingRef = useRef(false);
  const wantListeningRef = useRef(false);
  const speechLocaleRef = useRef<Locale>(locale);
  // Parsed portion of the in-progress phrase, the recognizer's full text for it, and the prefix
  // of that text already committed early (by a chip removal or language switch). iOS keeps the
  // whole session as one growing interim phrase, so committed words must not be re-read from it.
  const interimRef = useRef('');
  const rawInterimRef = useRef('');
  const consumedRef = useRef('');
  const lastFinalRef = useRef('');
  const sessionStartedAtRef = useRef(0);
  const quickEndsRef = useRef(0);
  const lastResultAtRef = useRef(Date.now());
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const prevItemsRef = useRef<ParsedItem[]>([]);
  const chipAnims = useRef<Map<string, Animated.Value>>(new Map());

  const vocabularyByLocale = useMemo(
    () => ({
      en: mergeVocabulary(vocabulary, POPULAR_ITEMS.en),
      he: mergeVocabulary(vocabulary, POPULAR_ITEMS.he),
    }),
    [vocabulary]
  );

  // Read by native event handlers and restarts, which outlive any single render
  const sessionOptionsRef = useRef({ vocabularyByLocale, preferences });
  sessionOptionsRef.current = { vocabularyByLocale, preferences };

  const items = useMemo(() => {
    const allSegments: Segment[] = showTextInput
      ? [{ kind: 'speech', text: devInput, locale: speechLocale }, ...segments]
      : interim
        ? [...segments, { kind: 'speech', text: interim, locale: speechLocale }]
        : segments;
    const commands = allSegments.flatMap((segment): VoiceCommand[] =>
      segment.kind === 'speech'
        ? parseCommands(segment.text, segment.locale, vocabularyByLocale[segment.locale])
        : [{ type: 'remove', name: segment.name }]
    );
    return applyCommands(commands);
  }, [segments, interim, devInput, showTextInput, speechLocale, vocabularyByLocale]);

  const caption = useMemo(() => {
    if (interim) return interim;
    const lastSpeech = [...segments].reverse().find((s) => s.kind === 'speech');
    return lastSpeech?.kind === 'speech' ? lastSpeech.text : '';
  }, [segments, interim]);

  useEffect(() => {
    if (!visible) return;
    setSegments([]);
    setInterim('');
    interimRef.current = '';
    setDevInput('');
    setErrorKey(null);
    setUseTextFallback(false);
    setSpeechLocale(locale);
    speechLocaleRef.current = locale;
    if (!preferences.parserDevMode) startListening();
    return () => teardown();
  }, [visible]);

  useEffect(() => {
    if (isActive) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseLoopRef.current?.stop();
  }, [isActive]);

  useEffect(() => {
    const prev = prevItemsRef.current;
    let hasNewItem = false;
    for (const item of items) {
      const key = matchKey(item.name);
      if (!chipAnims.current.has(key)) {
        chipAnims.current.set(key, new Animated.Value(1));
      }
      const prevItem = prev.find((p) => matchKey(p.name) === key);
      if (!prevItem) hasNewItem = true;
      if (prevItem && prevItem.quantity !== item.quantity) {
        const anim = chipAnims.current.get(key)!;
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.25, duration: 120, useNativeDriver: true }),
          Animated.spring(anim, { toValue: 1, useNativeDriver: true }),
        ]).start();
      }
    }
    if (hasNewItem && !showTextInput) Haptics.selectionAsync().catch(() => {});
    prevItemsRef.current = items;
  }, [items]);

  const setWantListening = (value: boolean) => {
    wantListeningRef.current = value;
    setIsActive(value);
  };

  const showPermissionAlert = () => {
    Alert.alert(
      t('voiceRecord.permDeniedTitle'),
      t('voiceRecord.permDeniedMessage'),
      [
        { text: t('common.cancel'), onPress: onClose, style: 'cancel' },
        { text: t('voiceRecord.openSettings'), onPress: () => { Linking.openSettings(); onClose(); } },
      ]
    );
  };

  const commitFinal = (text: string) => {
    interimRef.current = '';
    setInterim('');
    // Android can re-deliver the last phrase as the session's closing result
    if (!text || text === lastFinalRef.current) return;
    lastFinalRef.current = text;
    const segmentLocale = speechLocaleRef.current;
    setSegments((prev) => [...prev, { kind: 'speech', text, locale: segmentLocale }]);
  };

  const unconsumed = (text: string) => {
    const consumed = consumedRef.current;
    return consumed && text.startsWith(consumed) ? text.slice(consumed.length).trim() : text;
  };

  const resetPhrase = () => {
    rawInterimRef.current = '';
    consumedRef.current = '';
  };

  /** Commits the in-progress phrase now, so later results only contribute newly heard words */
  const commitInterimEarly = () => {
    if (!interimRef.current) return;
    consumedRef.current = rawInterimRef.current;
    commitFinal(interimRef.current);
  };

  const handleResult = (event: { isFinal: boolean; results: { transcript: string }[] }) => {
    lastResultAtRef.current = Date.now();
    const text = event.results[0]?.transcript?.trim() ?? '';
    if (event.isFinal) {
      quickEndsRef.current = 0;
      commitFinal(unconsumed(text));
      resetPhrase();
    } else {
      rawInterimRef.current = text;
      interimRef.current = unconsumed(text);
      setInterim(interimRef.current);
    }
  };

  const handleError = (event: { error: string }) => {
    if (TRANSIENT_ERRORS.has(event.error)) return;
    setWantListening(false);
    clearTimers();
    if (event.error === 'not-allowed') {
      showPermissionAlert();
      return;
    }
    setErrorKey(ERROR_KEYS[event.error] ?? 'voiceRecord.errorGeneric');
  };

  const handleEnd = () => {
    // Keep whatever was heard last, even if the session closed before finalizing it
    if (interimRef.current) commitFinal(interimRef.current);
    resetPhrase();
    if (!wantListeningRef.current) return;
    const endedQuickly = Date.now() - sessionStartedAtRef.current < QUICK_END_MS;
    quickEndsRef.current = endedQuickly ? quickEndsRef.current + 1 : 0;
    if (quickEndsRef.current > MAX_QUICK_RESTARTS) {
      setWantListening(false);
      clearTimers();
      setErrorKey('voiceRecord.errorGeneric');
      return;
    }
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (wantListeningRef.current) beginSession();
    }, RESTART_DELAY_MS);
  };

  const ensureSpeechModule = async (generation: number) => {
    if (speechModuleRef.current) return speechModuleRef.current;
    const mod = getExpoSpeechModule();
    const speech = mod?.ExpoSpeechRecognitionModule;
    if (!speech || !speech.isRecognitionAvailable()) {
      // Native module not available (e.g. Expo Go) — fall back to text input
      setUseTextFallback(true);
      return null;
    }
    const { granted } = await speech.requestPermissionsAsync();
    if (generation !== generationRef.current) return null;
    if (!granted) {
      showPermissionAlert();
      return null;
    }
    subscriptionsRef.current = [
      speech.addListener('result', handleResult),
      speech.addListener('error', handleError),
      speech.addListener('end', handleEnd),
    ];
    speechModuleRef.current = speech;
    return speech;
  };

  const beginSession = () => {
    const speech = speechModuleRef.current;
    if (!speech) return;
    const { vocabularyByLocale: vocab, preferences: prefs } = sessionOptionsRef.current;
    const sessionLocale = speechLocaleRef.current;
    lastFinalRef.current = '';
    resetPhrase();
    sessionStartedAtRef.current = Date.now();
    try {
      speech.start({
        lang: SPEECH_LANG[sessionLocale],
        interimResults: true,
        continuous: true,
        contextualStrings: vocab[sessionLocale].slice(0, MAX_CONTEXTUAL_STRINGS),
        // Reduce silence threshold so rapid consecutive items segment faster
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: prefs.silenceCompleteMs,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: prefs.silencePossiblyCompleteMs,
        },
        iosTaskHint: 'search',
      });
    } catch {
      setWantListening(false);
      clearTimers();
      setErrorKey('voiceRecord.errorGeneric');
    }
  };

  const startListening = async () => {
    if (isStartingRef.current || wantListeningRef.current) return;
    isStartingRef.current = true;
    const generation = generationRef.current;
    setErrorKey(null);
    try {
      const speech = await ensureSpeechModule(generation);
      if (!speech || generation !== generationRef.current) return;
      setWantListening(true);
      quickEndsRef.current = 0;
      lastResultAtRef.current = Date.now();
      silenceTimerRef.current = setInterval(() => {
        if (Date.now() - lastResultAtRef.current > SILENCE_TIMEOUT_MS) stopListening();
      }, SILENCE_CHECK_INTERVAL_MS);
      beginSession();
    } finally {
      isStartingRef.current = false;
    }
  };

  const clearTimers = () => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const stopListening = () => {
    setWantListening(false);
    clearTimers();
    try { speechModuleRef.current?.stop(); } catch {}
  };

  const teardown = () => {
    generationRef.current++;
    stopListening();
    subscriptionsRef.current.forEach((subscription) => subscription.remove());
    subscriptionsRef.current = [];
    speechModuleRef.current = null;
  };

  const handleManualStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    stopListening();
  };

  const handleMicResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    startListening();
  };

  const handleLanguageChange = (next: Locale) => {
    if (next === speechLocaleRef.current) return;
    Haptics.selectionAsync().catch(() => {});
    const hadLanguageError = errorKey === 'voiceRecord.errorLanguage';
    // Words heard so far belong to the previous language
    commitInterimEarly();
    speechLocaleRef.current = next;
    setSpeechLocale(next);
    setErrorKey(null);
    if (wantListeningRef.current) {
      // Ending the session makes the auto-restart pick up the new language
      lastResultAtRef.current = Date.now();
      try { speechModuleRef.current?.stop(); } catch {}
    } else if (hadLanguageError && !showTextInput) {
      startListening();
    }
  };

  const handleRemoveItem = (item: ParsedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Recorded as a step in the transcript, so saying the item again later re-adds it
    commitInterimEarly();
    setSegments((prev) => [...prev, { kind: 'remove', name: item.name }]);
  };

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onAdd(items);
    onClose();
  };

  const speechIsRTL = speechLocale === 'he';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalPanel, { maxHeight: '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('voiceRecord.title')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={t('voiceRecord.language')}
                style={{ flexDirection: 'row', borderRadius: 10, padding: 3, backgroundColor: theme.colors.surfaceHighlight }}
              >
                {SPEECH_LOCALES.map((option) => {
                  const selected = option === speechLocale;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => handleLanguageChange(option)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={{
                        minWidth: 40,
                        minHeight: 38,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? theme.colors.primary : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: theme.fonts.semibold, color: selected ? theme.colors.primaryText : theme.colors.textSecondary }}>
                        {t(LOCALE_LABEL_KEYS[option])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable onPress={onClose} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {!showTextInput ? (
            <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 }}>
              <Pressable
                onPress={isActive ? handleManualStop : handleMicResume}
                accessibilityRole="button"
                accessibilityLabel={isActive ? t('voiceRecord.tapToStop') : t('voiceRecord.stopped')}
              >
                <Animated.View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceHighlight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <Ionicons
                    name={isActive ? 'mic' : 'mic-off'}
                    size={32}
                    color={isActive ? theme.colors.primaryText : theme.colors.textSecondary}
                  />
                </Animated.View>
              </Pressable>
              <Text style={{ marginTop: 10, fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>
                {isActive ? t('voiceRecord.listening') : t('voiceRecord.stopped')}
              </Text>
              {caption ? (
                <Text
                  numberOfLines={2}
                  ellipsizeMode="head"
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    fontFamily: theme.fonts.regular,
                    fontStyle: 'italic',
                    color: theme.colors.text,
                    textAlign: 'center',
                    writingDirection: speechIsRTL ? 'rtl' : 'ltr',
                  }}
                >
                  “{caption}”
                </Text>
              ) : null}
              {errorKey ? (
                <Text style={{ marginTop: 8, fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.danger, textAlign: 'center' }}>
                  {t(errorKey)}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('voiceRecord.textModeLabel')}
              </Text>
              <TextInput
                autoFocus
                value={devInput}
                onChangeText={setDevInput}
                placeholder={createT(speechLocale)('voiceRecord.textModePlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                style={{
                  fontSize: 15,
                  fontFamily: theme.fonts.regular,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  height: 44,
                  backgroundColor: theme.colors.inputBackground,
                  textAlign: speechIsRTL ? 'right' : 'left',
                  writingDirection: speechIsRTL ? 'rtl' : 'ltr',
                }}
              />
            </View>
          )}

          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <View style={{ gap: 6, marginBottom: 16 }}>
                <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: 14, fontFamily: theme.fonts.regular }}>
                  {t('voiceRecord.noItems')}
                </Text>
                <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.fonts.regular, writingDirection: speechIsRTL ? 'rtl' : 'ltr' }}>
                  {createT(speechLocale)('voiceRecord.hint')}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 }}>
                {items.map((item) => {
                  const key = matchKey(item.name);
                  if (!chipAnims.current.has(key)) {
                    chipAnims.current.set(key, new Animated.Value(1));
                  }
                  const chipScale = chipAnims.current.get(key)!;
                  return (
                  <Animated.View
                    key={key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary,
                      borderRadius: 20,
                      paddingVertical: 6,
                      paddingLeft: 12,
                      paddingRight: 6,
                      gap: 4,
                      transform: [{ scale: chipScale }],
                    }}
                  >
                    <Text style={{ color: theme.colors.primaryText, fontSize: 14, fontFamily: theme.fonts.medium }}>
                      {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveItem(item)}
                      style={{ padding: 2 }}
                      accessibilityRole="button"
                      accessibilityLabel={t('voiceRecord.removeItem', { name: item.name })}
                    >
                      <Ionicons name="close-circle" size={16} color={theme.colors.primaryText} />
                    </Pressable>
                  </Animated.View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={{ padding: 16, paddingBottom: 20, borderTopWidth: 1, borderColor: theme.colors.border }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1, padding: 14, borderRadius: 12,
                  backgroundColor: theme.colors.surfaceHighlight,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={onClose}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.danger }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1, padding: 14, borderRadius: 12,
                  backgroundColor: items.length === 0 ? theme.colors.surfaceHighlight : theme.colors.primary,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                disabled={items.length === 0}
                onPress={handleAdd}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: items.length === 0 ? theme.colors.textSecondary : theme.colors.primaryText }}>
                  {items.length === 1 ? t('voiceRecord.add.one') : t('voiceRecord.add.other', { count: items.length })}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
