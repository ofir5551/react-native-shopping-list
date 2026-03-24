import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';

type ListNameModalProps = {
  visible: boolean;
  mode: 'create' | 'rename' | 'join' | 'share';
  value: string;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  description?: string;
  onDescriptionChange?: (value: string) => void;
};

export const ListNameModal = ({
  visible,
  mode,
  value,
  error,
  onChange,
  onSubmit,
  onClose,
  description,
  onDescriptionChange,
}: ListNameModalProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const { t } = useLocale();
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

  const titleMap = {
    create: t('listModal.createTitle'),
    rename: t('listModal.renameTitle'),
    join: t('listModal.joinTitle'),
    share: t('listModal.shareTitle'),
  };

  const submitLabelMap = {
    create: t('listModal.createButton'),
    rename: t('listModal.saveButton'),
    join: t('listModal.joinButton'),
    share: t('listModal.copyButton'),
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
          <Text style={styles.nameModalTitle}>{titleMap[mode]}</Text>

          {mode === 'share' ? (
            <View style={[styles.nameModalInput, { backgroundColor: theme.colors.surfaceHighlight, justifyContent: 'center' }]}>
              <Text style={{ color: theme.colors.text, textAlign: 'center', userSelect: 'all' }}>{value}</Text>
            </View>
          ) : (
            <TextInput
              ref={inputRef}
              showSoftInputOnFocus
              placeholder={mode === 'join' ? t('listModal.joinPlaceholder') : t('listModal.listNamePlaceholder')}
              value={value}
              onChangeText={onChange}
              onSubmitEditing={(mode === 'create' || mode === 'rename') ? undefined : onSubmit}
              returnKeyType={(mode === 'create' || mode === 'rename') ? 'next' : 'done'}
              style={styles.nameModalInput}
              placeholderTextColor={theme.colors.textSecondary}
            />
          )}

          {(mode === 'create' || mode === 'rename') && (
            <TextInput
              showSoftInputOnFocus
              placeholder={t('listModal.descriptionPlaceholder')}
              value={description ?? ''}
              onChangeText={onDescriptionChange}
              onSubmitEditing={onSubmit}
              returnKeyType="done"
              style={[styles.nameModalInput, { marginTop: 8 }]}
              placeholderTextColor={theme.colors.textSecondary}
            />
          )}

          {error ? <Text style={styles.nameModalError}>{error}</Text> : null}

          <View style={styles.nameModalActions}>
            <Pressable style={styles.nameModalCancelButton} onPress={onClose}>
              <Text style={styles.nameModalCancelText}>{t('listModal.cancelButton')}</Text>
            </Pressable>
            <Pressable style={styles.nameModalSubmitButton} onPress={mode === 'share' ? handleCopy : onSubmit}>
              <Text style={styles.nameModalSubmitText}>{submitLabelMap[mode]}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
