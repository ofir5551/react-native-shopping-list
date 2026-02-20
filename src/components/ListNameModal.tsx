import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppStyles } from '../styles/appStyles';

type ListNameModalProps = {
  visible: boolean;
  mode: 'create' | 'rename' | 'join' | 'share';
  value: string;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const ListNameModal = ({
  visible,
  mode,
  value,
  error,
  onChange,
  onSubmit,
  onClose,
}: ListNameModalProps) => {
  const styles = useAppStyles();
  const inputRef = useRef<TextInput | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusInput = () => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  };

  useEffect(
    () => () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    },
    []
  );

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onShow={focusInput}
      onRequestClose={onClose}
    >
      <View style={styles.nameModalContainer}>
        <Pressable style={styles.nameModalBackdrop} onPress={onClose} />
        <View style={styles.nameModalCard}>
          <Text style={styles.nameModalTitle}>
            {mode === 'create' ? 'Create list' : mode === 'rename' ? 'Rename list' : mode === 'join' ? 'Join shared list' : 'Share List'}
          </Text>

          {mode === 'share' ? (
            <View style={[styles.nameModalInput, { backgroundColor: '#f5f5f5', justifyContent: 'center' }]}>
              <Text style={{ color: '#333', textAlign: 'center', userSelect: 'all' }}>{value}</Text>
            </View>
          ) : (
            <TextInput
              ref={inputRef}
              showSoftInputOnFocus
              placeholder={mode === 'join' ? 'Paste Share ID' : 'List name'}
              value={value}
              onChangeText={onChange}
              onSubmitEditing={onSubmit}
              returnKeyType="done"
              style={styles.nameModalInput}
              placeholderTextColor="#8b8b8b"
            />
          )}

          {error ? <Text style={styles.nameModalError}>{error}</Text> : null}

          <View style={styles.nameModalActions}>
            <Pressable style={styles.nameModalCancelButton} onPress={onClose}>
              <Text style={styles.nameModalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.nameModalSubmitButton} onPress={mode === 'share' ? handleCopy : onSubmit}>
              <Text style={styles.nameModalSubmitText}>
                {mode === 'create' ? 'Create' : mode === 'rename' ? 'Save' : mode === 'join' ? 'Join' : 'Copy ID'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
