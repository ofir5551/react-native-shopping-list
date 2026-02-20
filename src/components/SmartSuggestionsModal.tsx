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
import { useAppStyles } from '../styles/appStyles';
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
    onAddSelected: (items: { name: string; quantity: number }[]) => void;
    onQuickAdd: (items: { name: string; quantity: number }[]) => void;
};

export const SmartSuggestionsModal = ({
    visible,
    prompt,
    onClose,
    onAddSelected,
    onQuickAdd,
}: SmartSuggestionsModalProps) => {
    const styles = useAppStyles();
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
        const newItems = [...items];
        newItems[index].selected = !newItems[index].selected;
        setItems(newItems);
    };

    const handleUpdateQuantity = (index: number, delta: number) => {
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
                        <Text style={styles.modalTitle}>Smart Suggestions</Text>
                        <Pressable onPress={onClose} style={styles.modalCloseButton}>
                            <Ionicons name="close" size={18} color="#4a4a4a" />
                        </Pressable>
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                        <Text style={{ fontSize: 14, color: '#666' }}>
                            Prompt: "{prompt}"
                        </Text>
                    </View>

                    {loading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={{ marginTop: 16, color: '#666' }}>Generating list...</Text>
                        </View>
                    ) : error ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Ionicons name="alert-circle-outline" size={32} color="#ff3b30" />
                            <Text style={{ marginTop: 12, color: '#ff3b30', textAlign: 'center' }}>
                                {error}
                            </Text>
                            <Pressable
                                style={{ marginTop: 16, padding: 12, backgroundColor: '#f2f2f7', borderRadius: 8 }}
                                onPress={() => generateSuggestions(prompt)}
                            >
                                <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Try Again</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                            {items.length === 0 ? (
                                <Text style={{ textAlign: 'center', color: '#8b8b8b', marginTop: 20 }}>
                                    No items suggested.
                                </Text>
                            ) : (
                                items.map((item, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: '#f0f0f0',
                                        }}
                                    >
                                        <Pressable
                                            style={{ paddingRight: 12 }}
                                            onPress={() => handleToggleSelect(index)}
                                        >
                                            <Ionicons
                                                name={item.selected ? "checkmark-circle" : "ellipse-outline"}
                                                size={24}
                                                color={item.selected ? "#007AFF" : "#d1d1d6"}
                                            />
                                        </Pressable>

                                        <Text style={{ flex: 1, fontSize: 16, color: '#333' }}>
                                            {item.name}
                                        </Text>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f7', borderRadius: 8, overflow: 'hidden' }}>
                                            <Pressable
                                                style={{ padding: 8, paddingHorizontal: 12 }}
                                                onPress={() => handleUpdateQuantity(index, -1)}
                                            >
                                                <Feather name="minus" size={16} color="#007AFF" />
                                            </Pressable>
                                            <Text style={{ fontWeight: '600', minWidth: 20, textAlign: 'center', color: '#333' }}>
                                                {item.quantity}
                                            </Text>
                                            <Pressable
                                                style={{ padding: 8, paddingHorizontal: 12 }}
                                                onPress={() => handleUpdateQuantity(index, 1)}
                                            >
                                                <Feather name="plus" size={16} color="#007AFF" />
                                            </Pressable>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    )}

                    <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#f0f0f0', gap: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                                style={{
                                    flex: 1,
                                    padding: 14,
                                    borderRadius: 12,
                                    backgroundColor: '#f2f2f7',
                                    alignItems: 'center',
                                }}
                                onPress={onClose}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ff3b30' }}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                style={{
                                    flex: 1,
                                    padding: 14,
                                    borderRadius: 12,
                                    backgroundColor: selectedCount === 0 || loading ? '#b0d1ff' : '#007AFF',
                                    alignItems: 'center',
                                }}
                                disabled={selectedCount === 0 || loading}
                                onPress={() => onAddSelected(getSelectedItems())}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                                    Add
                                </Text>
                            </Pressable>
                        </View>

                        <Pressable
                            style={{
                                padding: 14,
                                borderRadius: 12,
                                backgroundColor: selectedCount === 0 || loading ? '#e5e5ea' : '#34C759',
                                alignItems: 'center',
                            }}
                            disabled={selectedCount === 0 || loading}
                            onPress={() => onQuickAdd(getSelectedItems())}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '600', color: selectedCount === 0 || loading ? '#a1a1aa' : '#ffffff' }}>
                                Quick Add ({selectedCount})
                            </Text>
                        </Pressable>
                    </View>

                </View>
            </View>
        </Modal>
    );
};
