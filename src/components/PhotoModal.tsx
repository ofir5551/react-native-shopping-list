import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../supabase';

type PhotoItem = {
    name: string;
    quantity: number;
    selected: boolean;
};

type PhotoModalState = 'idle' | 'loading' | 'results' | 'error';

type PhotoModalProps = {
    visible: boolean;
    onClose: () => void;
    onAdd: (items: { name: string; quantity: number }[]) => void;
};

const triggerHaptic = () => {
    try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
};

const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    allowsEditing: false,
    quality: 0.7,
    base64: true,
    exif: false,
};

export const PhotoModal = ({ visible, onClose, onAdd }: PhotoModalProps) => {
    const styles = useAppStyles();
    const { theme } = useTheme();
    const { t } = useLocale();
    const [state, setState] = useState<PhotoModalState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<PhotoItem[]>([]);

    const reset = () => {
        setState('idle');
        setError(null);
        setItems([]);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const processImage = async (base64: string) => {
        setState('loading');
        setError(null);
        try {
            const { data, error: fnError } = await supabase.functions.invoke('parse-photo', {
                body: { imageBase64: base64 },
            });

            if (fnError) {
                throw new Error(fnError.message || 'Failed to parse photo');
            }

            const parsed: { name: string; quantity: number }[] = data?.items || [];
            setItems(
                parsed.map((item) => ({
                    name: item.name,
                    quantity: item.quantity || 1,
                    selected: true,
                }))
            );
            setState('results');
        } catch (err: any) {
            console.error('Error parsing photo:', err);
            setError(err.message || 'An unexpected error occurred.');
            setState('error');
        }
    };

    const pickFromLibrary = async () => {
        triggerHaptic();
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
        const result = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
        if (!result.canceled && result.assets[0]?.base64) {
            await processImage(result.assets[0].base64);
        }
    };

    const takePhoto = async () => {
        triggerHaptic();
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;
        const result = await ImagePicker.launchCameraAsync(IMAGE_OPTIONS);
        if (!result.canceled && result.assets[0]?.base64) {
            await processImage(result.assets[0].base64);
        }
    };

    const handleToggleSelect = (index: number) => {
        triggerHaptic();
        const updated = [...items];
        updated[index] = { ...updated[index], selected: !updated[index].selected };
        setItems(updated);
    };

    const handleUpdateQuantity = (index: number, delta: number) => {
        triggerHaptic();
        const updated = [...items];
        const newQty = updated[index].quantity + delta;
        if (newQty > 0) {
            updated[index] = { ...updated[index], quantity: newQty };
            setItems(updated);
        }
    };

    const selectedItems = items.filter((item) => item.selected);
    const selectedCount = selectedItems.length;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.modalContainer}>
                <Pressable style={styles.modalBackdrop} onPress={handleClose} />
                <View style={[styles.modalPanel, { maxHeight: '85%' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('fromPhoto.title')}</Text>
                        <Pressable onPress={handleClose} style={styles.modalCloseButton}>
                            <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                        </Pressable>
                    </View>

                    {state === 'idle' && (
                        <View style={{ padding: 20, gap: 12 }}>
                            <Pressable
                                style={({ pressed }) => ({
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: 16,
                                    borderRadius: 12,
                                    backgroundColor: theme.colors.surfaceHighlight,
                                    opacity: pressed ? 0.7 : 1,
                                })}
                                onPress={takePhoto}
                                accessibilityRole="button"
                                accessibilityLabel={t('fromPhoto.takePhoto')}
                            >
                                <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
                                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>
                                    {t('fromPhoto.takePhoto')}
                                </Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => ({
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: 16,
                                    borderRadius: 12,
                                    backgroundColor: theme.colors.surfaceHighlight,
                                    opacity: pressed ? 0.7 : 1,
                                })}
                                onPress={pickFromLibrary}
                                accessibilityRole="button"
                                accessibilityLabel={t('fromPhoto.chooseLibrary')}
                            >
                                <Ionicons name="images-outline" size={24} color={theme.colors.primary} />
                                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>
                                    {t('fromPhoto.chooseLibrary')}
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {state === 'loading' && (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={{ marginTop: 16, color: theme.colors.textSecondary }}>
                                {t('fromPhoto.scanning')}
                            </Text>
                        </View>
                    )}

                    {state === 'error' && (
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
                                onPress={reset}
                                accessibilityRole="button"
                                accessibilityLabel={t('fromPhoto.retryLabel')}
                            >
                                <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.semibold }}>
                                    {t('fromPhoto.tryAgain')}
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {state === 'results' && (
                        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                            {items.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
                                        {t('fromPhoto.noItems')}
                                    </Text>
                                    <Pressable
                                        style={({ pressed }) => ({
                                            marginTop: 16,
                                            padding: 12,
                                            backgroundColor: theme.colors.surfaceHighlight,
                                            borderRadius: 8,
                                            opacity: pressed ? 0.7 : 1,
                                        })}
                                        onPress={reset}
                                        accessibilityRole="button"
                                        accessibilityLabel={t('fromPhoto.retryLabel')}
                                    >
                                        <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.semibold }}>
                                            {t('fromPhoto.tryAgain')}
                                        </Text>
                                    </Pressable>
                                </View>
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
                                                name={item.selected ? 'checkmark-circle' : 'ellipse-outline'}
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
                                            <Pressable onPress={() => {}}>
                                                <Text style={{ fontWeight: '600', minWidth: 20, textAlign: 'center', color: theme.colors.text }}>
                                                    {item.quantity}
                                                </Text>
                                            </Pressable>
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

                    {(state === 'idle' || state === 'results') && (
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
                                    onPress={handleClose}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('fromPhoto.cancelLabel')}
                                >
                                    <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.danger }}>
                                        {t('fromPhoto.cancel')}
                                    </Text>
                                </Pressable>

                                {state === 'results' && (
                                    <Pressable
                                        style={({ pressed }) => ({
                                            flex: 1,
                                            padding: 14,
                                            borderRadius: 12,
                                            backgroundColor: selectedCount === 0 ? theme.colors.surfaceHighlight : theme.colors.primary,
                                            alignItems: 'center' as const,
                                            opacity: pressed ? 0.7 : 1,
                                        })}
                                        disabled={selectedCount === 0}
                                        onPress={() => {
                                            triggerHaptic();
                                            onAdd(selectedItems);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={t('fromPhoto.addLabel', { count: selectedCount })}
                                    >
                                        <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: selectedCount === 0 ? theme.colors.textSecondary : theme.colors.primaryText }}>
                                            {t('fromPhoto.addToList', { count: selectedCount })}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};
