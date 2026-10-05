import React, { useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { TranslationKey } from '../i18n/translations/en';
import { SignUpPromptReason } from '../hooks/useSignUpPrompt';
import { GoogleSignInButton } from './GoogleSignInButton';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const HEADLINES: Record<SignUpPromptReason, { title: TranslationKey; subtitle: TranslationKey }> = {
    first: { title: 'signUpPrompt.titleDefault', subtitle: 'signUpPrompt.subtitleDefault' },
    periodic: { title: 'signUpPrompt.titleDefault', subtitle: 'signUpPrompt.subtitleDefault' },
    ai: { title: 'signUpPrompt.titleAi', subtitle: 'signUpPrompt.subtitleAi' },
    share: { title: 'signUpPrompt.titleShare', subtitle: 'signUpPrompt.subtitleShared' },
    join: { title: 'signUpPrompt.titleJoin', subtitle: 'signUpPrompt.subtitleShared' },
};

const BENEFITS: { icon: IconName; title: TranslationKey; text: TranslationKey }[] = [
    { icon: 'cloud-outline', title: 'signUpPrompt.benefitBackupTitle', text: 'signUpPrompt.benefitBackupText' },
    { icon: 'people-outline', title: 'signUpPrompt.benefitShareTitle', text: 'signUpPrompt.benefitShareText' },
    { icon: 'sparkles', title: 'signUpPrompt.benefitAiTitle', text: 'signUpPrompt.benefitAiText' },
    { icon: 'phone-portrait-outline', title: 'signUpPrompt.benefitDevicesTitle', text: 'signUpPrompt.benefitDevicesText' },
];

// Below this window height the prompt switches to a tighter layout so everything fits without scrolling.
const COMPACT_HEIGHT = 760;

type SignUpPromptModalProps = {
    reason: SignUpPromptReason | null;
    onClose: (dontShowAgain: boolean) => void;
    onEmailSignUp: () => void;
    onSignIn: () => void;
};

export const SignUpPromptModal = ({ reason, ...props }: SignUpPromptModalProps) =>
    reason ? <SignUpPromptContent reason={reason} {...props} /> : null;

// Mounted only while the prompt is open, so the checkbox starts unticked every time.
const SignUpPromptContent = ({ reason, onClose, onEmailSignUp, onSignIn }: SignUpPromptModalProps & { reason: SignUpPromptReason }) => {
    const styles = useAppStyles();
    const { theme } = useTheme();
    const { t } = useLocale();
    const { height } = useWindowDimensions();
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const compact = height < COMPACT_HEIGHT;
    const isAutomatic = reason === 'first' || reason === 'periodic';
    const headline = HEADLINES[reason];
    const close = () => onClose(isAutomatic && dontShowAgain);

    return (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
            <SafeAreaView style={[styles.container, { paddingHorizontal: 0, paddingTop: 0 }]}>
                <View style={{ paddingHorizontal: 20, paddingTop: 8, alignItems: 'flex-end' }}>
                    <Pressable
                        style={styles.iconButton}
                        onPress={close}
                        accessibilityRole="button"
                        accessibilityLabel={t('signUpPrompt.close')}
                    >
                        <Ionicons name="close" size={22} color={theme.colors.text} />
                    </Pressable>
                </View>

                {/* Pitch — takes the remaining space and centres itself in it */}
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
                    <View style={{ alignItems: 'center', marginBottom: compact ? 16 : 28 }}>
                        <View style={{
                            width: compact ? 52 : 72,
                            height: compact ? 52 : 72,
                            borderRadius: compact ? 16 : 22,
                            backgroundColor: theme.colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: compact ? 10 : 16,
                        }}>
                            <Ionicons name="bag-outline" size={compact ? 28 : 40} color="#ffffff" />
                        </View>
                        <Text style={[styles.title, { textAlign: 'center', marginBottom: compact ? 4 : 8 }, compact && { fontSize: 22 }]}>
                            {t(headline.title)}
                        </Text>
                        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                            {t(headline.subtitle)}
                        </Text>
                    </View>

                    <View style={{ gap: compact ? 10 : 16, marginBottom: compact ? 14 : 20 }}>
                        {BENEFITS.map((benefit) => (
                            <View key={benefit.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <View style={{
                                    width: compact ? 34 : 40,
                                    height: compact ? 34 : 40,
                                    borderRadius: compact ? 10 : 12,
                                    backgroundColor: theme.colors.surface,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Ionicons name={benefit.icon} size={compact ? 18 : 20} color={theme.colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>
                                        {t(benefit.title)}
                                    </Text>
                                    {!compact && (
                                        <Text style={{ fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>
                                            {t(benefit.text)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                        <Text style={{ fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }}>
                            {t('signUpPrompt.listsComeAlong')}
                        </Text>
                    </View>
                </View>

                {/* Actions — pinned to the bottom so they are always visible */}
                <View style={{ paddingHorizontal: 24, paddingTop: compact ? 12 : 20, paddingBottom: compact ? 8 : 16 }}>
                    <GoogleSignInButton onSuccess={() => onClose(false)} />

                    <Pressable
                        style={[styles.authButtonSecondary, { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: compact ? 4 : 12 }]}
                        onPress={onEmailSignUp}
                        accessibilityRole="button"
                    >
                        <Ionicons name="mail-outline" size={18} color={theme.colors.text} />
                        <Text style={[styles.authButtonTextSecondary, { fontSize: 16 }]}>
                            {t('signUpPrompt.signUpWithEmail')}
                        </Text>
                    </Pressable>

                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: compact ? 6 : 8 }}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 15, fontFamily: theme.fonts.regular }}>
                            {t('signUpPrompt.haveAccount')}
                        </Text>
                        <Pressable onPress={onSignIn} accessibilityRole="button">
                            <Text style={{ color: theme.colors.primary, fontSize: 15, fontFamily: theme.fonts.semibold }}>
                                {t('signUpPrompt.signIn')}
                            </Text>
                        </Pressable>
                    </View>

                    {isAutomatic && (
                        <Pressable
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: compact ? 6 : 8 }}
                            onPress={() => setDontShowAgain((value) => !value)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: dontShowAgain }}
                        >
                            <Ionicons
                                name={dontShowAgain ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={dontShowAgain ? theme.colors.primary : theme.colors.textSecondary}
                            />
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 14, fontFamily: theme.fonts.regular }}>
                                {t('signUpPrompt.dontShowAgain')}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};
