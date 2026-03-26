import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Modal, NativeModules, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { useToast } from '../context/ToastContext';
import { usePreferences } from '../context/PreferencesContext';
import { useAppStyles } from '../styles/appStyles';
import { parseTranscript } from '../utils/itemParser';

const SILENCE_TIMEOUT_MS = 10000;
const SILENCE_CHECK_INTERVAL_MS = 500;

// expo-speech-recognition requires a dev build — not available in Expo Go
const hasNativeModule = !!NativeModules.ExpoSpeechRecognition;

let expoSpeechModule: any = null;
async function getExpoSpeechModule() {
  if (!hasNativeModule) return null;
  if (expoSpeechModule) return expoSpeechModule;
  try {
    expoSpeechModule = await import('expo-speech-recognition');
    return expoSpeechModule;
  } catch {
    return null;
  }
}

type RecordModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (items: { name: string; quantity: number }[]) => void;
};

export const RecordModal = ({ visible, onClose, onAdd }: RecordModalProps) => {
  const { theme } = useTheme();
  const { t } = useLocale();
  const { showToast } = useToast();
  const { preferences } = usePreferences();
  const styles = useAppStyles();
  const showTextInput = preferences.parserDevMode;

  const [isListening, setIsListening] = useState(false);
  const [items, setItems] = useState<{ name: string; quantity: number }[]>([]);
  const [devInput, setDevInput] = useState('');

  const committedRef = useRef('');
  const lastResultAtRef = useRef(Date.now());
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      committedRef.current = '';
      lastResultAtRef.current = Date.now();
      setItems([]);
      setDevInput('');
      if (!showTextInput) startRecognition();
    } else {
      stopEverything();
    }
    return () => stopEverything();
  }, [visible, showTextInput]);

  useEffect(() => {
    if (isListening) {
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
  }, [isListening]);

  const startRecognition = async () => {
    const mod = await getExpoSpeechModule();
    if (!mod) {
      showToast(t('voiceRecord.micDenied'));
      onClose();
      return;
    }

    const { ExpoSpeechRecognitionModule } = mod;
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(
        t('voiceRecord.permDeniedTitle'),
        t('voiceRecord.permDeniedMessage'),
        [
          { text: t('common.cancel'), onPress: onClose, style: 'cancel' },
          { text: t('voiceRecord.openSettings'), onPress: () => { Linking.openSettings(); onClose(); } },
        ]
      );
      return;
    }

    const { ExpoWebSpeechRecognition } = mod;
    const recognition = new ExpoWebSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      lastResultAtRef.current = Date.now();
      let committed = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          committed += (committed ? ', ' : '') + result[0].transcript;
        } else {
          interim = result[0].transcript;
        }
      }
      committedRef.current = committed;
      const full = interim
        ? (committed ? `${committed}, ${interim}` : interim)
        : committed;
      setItems(parseTranscript(full));
    };

    recognition.start();
    lastResultAtRef.current = Date.now();
    silenceTimerRef.current = setInterval(() => {
      if (Date.now() - lastResultAtRef.current > SILENCE_TIMEOUT_MS) {
        try { recognition.stop(); } catch {}
        clearSilenceTimer();
      }
    }, SILENCE_CHECK_INTERVAL_MS);
  };

  const stopEverything = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    clearSilenceTimer();
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const handleManualStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try { recognitionRef.current?.stop(); } catch {}
    clearSilenceTimer();
  };

  const handleMicResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    startRecognition();
  };

  const handleRemoveItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onAdd(items);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalPanel, { maxHeight: '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('voiceRecord.title')}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {!showTextInput ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Pressable
                onPress={isListening ? handleManualStop : handleMicResume}
                accessibilityRole="button"
                accessibilityLabel={isListening ? t('voiceRecord.tapToStop') : t('voiceRecord.stopped')}
              >
                <Animated.View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: isListening ? theme.colors.primary : theme.colors.surfaceHighlight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <Ionicons
                    name={isListening ? 'mic' : 'mic-off'}
                    size={32}
                    color={isListening ? theme.colors.primaryText : theme.colors.textSecondary}
                  />
                </Animated.View>
              </Pressable>
              <Text style={{ marginTop: 10, fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>
                {isListening ? t('voiceRecord.listening') : t('voiceRecord.stopped')}
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Dev mode — type to test parser
              </Text>
              <TextInput
                autoFocus
                value={devInput}
                onChangeText={(text) => {
                  setDevInput(text);
                  setItems(parseTranscript(text));
                }}
                placeholder="e.g. 5 bread next 2 milk"
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
                }}
              />
            </View>
          )}

          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: 14, fontFamily: theme.fonts.regular, marginBottom: 16 }}>
                {t('voiceRecord.noItems')}
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 }}>
                {items.map((item, index) => (
                  <View
                    key={`${item.name}-${index}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary,
                      borderRadius: 20,
                      paddingVertical: 6,
                      paddingLeft: 12,
                      paddingRight: 6,
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: theme.colors.primaryText, fontSize: 14, fontFamily: theme.fonts.medium }}>
                      {item.quantity > 1 ? `${item.quantity}\u00d7 ` : ''}{item.name}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveItem(index)}
                      style={{ padding: 2 }}
                      accessibilityRole="button"
                      accessibilityLabel={t('voiceRecord.removeItem', { name: item.name })}
                    >
                      <Ionicons name="close-circle" size={16} color={theme.colors.primaryText} />
                    </Pressable>
                  </View>
                ))}
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
                  {t('voiceRecord.add', { count: items.length })}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
