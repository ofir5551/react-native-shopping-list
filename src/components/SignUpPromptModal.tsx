import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
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

type SignUpPromptModalProps = {
    reason: SignUpPromptReason | null;
    onClose: () => void;
    onEmailSignUp: () => void;
    onSignIn: () => void;
};

export const SignUpPromptModal = ({ reason, onClose, onEmailSignUp, onSignIn }: SignUpPromptModalProps) => {
    const styles = useAppStyles();
    const { theme } = useTheme();
    const { t } = useLocale();

    if (!reason) return null;
    const headline = HEADLINES[reason];

    return (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <SafeAreaView style={[styles.container, { paddingHorizontal: 0 }]}>
                <View style={{ paddingHorizontal: 20, paddingTop: 8, alignItems: 'flex-end' }}>
                    <Pressable
                        style={styles.iconButton}
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel={t('signUpPrompt.close')}
                    >
                        <Ionicons name="close" size={22} color={theme.colors.text} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
                    {/* Branding + headline */}
                    <View style={{ alignItems: 'center', marginBottom: 28 }}>
                        <View style={{
                            width: 72,
                            height: 72,
                            borderRadius: 22,
                            backgroundColor: theme.colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Ionicons name="bag-outline" size={40} color="#ffffff" />
                        </View>
                        <Text style={[styles.title, { textAlign: 'center', marginBottom: 8 }]}>
                            {t(headline.title)}
                        </Text>
                        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                            {t(headline.subtitle)}
                        </Text>
                    </View>

                    {/* Benefits */}
                    <View style={{ gap: 16, marginBottom: 20 }}>
                        {BENEFITS.map((benefit) => (
                            <View key={benefit.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    backgroundColor: theme.colors.surface,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Ionicons name={benefit.icon} size={20} color={theme.colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>
                                        {t(benefit.title)}
                                    </Text>
                                    <Text style={{ fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>
                                        {t(benefit.text)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Reassurance */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                        <Text style={{ fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }}>
                            {t('signUpPrompt.listsComeAlong')}
                        </Text>
                    </View>

                    {/* Actions */}
                    <GoogleSignInButton onSuccess={onClose} />

                    <Pressable
                        style={[styles.authButtonSecondary, { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }]}
                        onPress={onEmailSignUp}
                        accessibilityRole="button"
                    >
                        <Ionicons name="mail-outline" size={18} color={theme.colors.text} />
                        <Text style={[styles.authButtonTextSecondary, { fontSize: 16 }]}>
                            {t('signUpPrompt.signUpWithEmail')}
                        </Text>
                    </Pressable>

                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 8 }}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                            {t('signUpPrompt.haveAccount')}
                        </Text>
                        <Pressable onPress={onSignIn} accessibilityRole="button">
                            <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '600' }}>
                                {t('signUpPrompt.signIn')}
                            </Text>
                        </Pressable>
                    </View>

                    <Pressable style={{ alignItems: 'center', paddingVertical: 12 }} onPress={onClose} accessibilityRole="button">
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                            {reason === 'first' ? t('signUpPrompt.continueAsGuest') : t('signUpPrompt.maybeLater')}
                        </Text>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};
