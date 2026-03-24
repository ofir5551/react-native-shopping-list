import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../supabase';

type SuggestionItem = {
    name: string;
    quantity: number;
    selected: boolean;
};

type SmartSuggestionsModalProps = {
    visible: boolean;
    prompt: string;
    onClose: () => void;
    onQuickAdd: (items: { name: string; quantity: number }[]) => void;
};

const triggerHaptic = () => {
    try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
};

export const SmartSuggestionsModal = ({
    visible,
    prompt,
    onClose,
    onQuickAdd,
}: SmartSuggestionsModalProps) => {
    const styles = useAppStyles();
    const { theme } = useTheme();
    const { t } = useLocale();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<SuggestionItem[]>([]);

    useEffect(() => {
        if (visible && prompt) {
            generateSuggestions(prompt);
        } else {
            setItems([]);
            setError(null);
        }
    }, [visible, prompt]);

    const generateSuggestions = async (userPrompt: string) => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fnError } = await supabase.functions.invoke('suggest-items', {
                body: { prompt: userPrompt }
            });

            if (fnError) {
                throw new Error(fnError.message || 'Failed to generate suggestions');
            }

            const generatedList = data?.items || [];
            setItems(
                generatedList.map((item: { name: string; quantity: number }) => ({
                    name: item.name,
                    quantity: item.quantity || 1,
                    selected: true,
                }))
            );
        } catch (err: any) {
            console.error('Error fetching suggestions:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (index: number) => {
        triggerHaptic();
        const newItems = [...items];
        newItems[index].selected = !newItems[index].selected;
        setItems(newItems);
    };

    const handleUpdateQuantity = (index: number, delta: number) => {
        triggerHaptic();
        const newItems = [...items];
        const newQuantity = newItems[index].quantity + delta;
        if (newQuantity > 0) {
            newItems[index].quantity = newQuantity;
            setItems(newItems);
        }
    };

    const getSelectedItems = () => items.filter((item) => item.selected);

    const selectedCount = getSelectedItems().length;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <Pressable style={styles.modalBackdrop} onPress={onClose} />
                <View style={[styles.modalPanel, { maxHeight: '85%' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('smartSuggestions.title')}</Text>
                        <Pressable onPress={onClose} style={styles.modalCloseButton}>
                            <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                        </Pressable>
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                        <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                            {t('smartSuggestions.prompt', { prompt })}
                        </Text>
                    </View>

                    {loading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={{ marginTop: 16, color: theme.colors.textSecondary }}>{t('smartSuggestions.generating')}</Text>
                        </View>
                    ) : error ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Ionicons name="alert-circle-outline" size={32} color={theme.colors.danger} />
                            <Text style={{ marginTop: 12, color: theme.colors.danger, textAlign: 'center' }}>
                                {error}
                            </Text>
                            <Pressable
                                style={({ pressed }) => ({
                                    marginTop: 16,
                                    padding: 12,
                                    backgroundColor: theme.colors.surfaceHighlight,
                                    borderRadius: 8,
                                    opacity: pressed ? 0.7 : 1,
                                })}
                                onPress={() => generateSuggestions(prompt)}
                                accessibilityRole="button"
                                accessibilityLabel={t('smartSuggestions.retryLabel')}
                            >
                                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{t('smartSuggestions.tryAgain')}</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                            {items.length === 0 ? (
                                <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: 20 }}>
                                    {t('smartSuggestions.noItems')}
                                </Text>
                            ) : (
                                items.map((item, index) => (
                                    <Pressable
                                        key={index}
                                        style={({ pressed }) => ({
                                            flexDirection: 'row' as const,
                                            alignItems: 'center' as const,
                                            paddingVertical: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: theme.colors.border,
                                            opacity: pressed ? 0.7 : 1,
                                        })}
                                        onPress={() => handleToggleSelect(index)}
                                        accessibilityRole="button"
                                        accessibilityLabel={item.selected ? t('smartSuggestions.deselectLabel', { name: item.name }) : t('smartSuggestions.selectLabel', { name: item.name })}
                                        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                    >
                                        <View style={{ paddingRight: 12 }}>
                                            <Ionicons
                                                name={item.selected ? "checkmark-circle" : "ellipse-outline"}
                                                size={24}
                                                color={item.selected ? theme.colors.primary : theme.colors.border}
                                            />
                                        </View>

                                        <Text style={{ flex: 1, fontSize: 16, color: theme.colors.text }}>
                                            {item.name}
                                        </Text>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceHighlight, borderRadius: 8, overflow: 'hidden' }}>
                                            <Pressable
                                                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                                                onPress={() => handleUpdateQuantity(index, -1)}
                                                accessibilityLabel={t('smartSuggestions.decreaseQty', { name: item.name })}
                                            >
                                                <Feather name="minus" size={16} color={theme.colors.primary} />
                                            </Pressable>
                                            <Text style={{ fontWeight: '600', minWidth: 20, textAlign: 'center', color: theme.colors.text }}>
                                                {item.quantity}
                                            </Text>
                                            <Pressable
                                                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                                                onPress={() => handleUpdateQuantity(index, 1)}
                                                accessibilityLabel={t('smartSuggestions.increaseQty', { name: item.name })}
                                            >
                                                <Feather name="plus" size={16} color={theme.colors.primary} />
                                            </Pressable>
                                        </View>
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                    )}

                    <View style={{ padding: 16, paddingBottom: 20, borderTopWidth: 1, borderColor: theme.colors.border }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                                style={({ pressed }) => ({
                                    flex: 1,
                                    padding: 14,
                                    borderRadius: 12,
                                    backgroundColor: theme.colors.surfaceHighlight,
                                    alignItems: 'center' as const,
                                    opacity: pressed ? 0.7 : 1,
                                })}
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel={t('smartSuggestions.cancelLabel')}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.danger }}>{t('smartSuggestions.cancel')}</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => ({
                                    flex: 1,
                                    padding: 14,
                                    borderRadius: 12,
                                    backgroundColor: selectedCount === 0 || loading ? theme.colors.surfaceHighlight : theme.colors.primary,
                                    alignItems: 'center' as const,
                                    opacity: pressed ? 0.7 : 1,
                                })}
                                disabled={selectedCount === 0 || loading}
                                onPress={() => {
                                    triggerHaptic();
                                    onQuickAdd(getSelectedItems());
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={t('smartSuggestions.addLabel', { count: selectedCount })}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: selectedCount === 0 || loading ? theme.colors.textSecondary : theme.colors.primaryText }}>
                                    {t('smartSuggestions.addToList', { count: selectedCount })}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                </View>
            </View>
        </Modal>
    );
};
