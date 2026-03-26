import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';

type SpeedDialAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type CaretPopoverProps = {
  onAiSuggestions: () => void;
  onSavedSets: () => void;
  onRecord: () => void;
  onFromPhoto: () => void;
  onClose: () => void;
  // MVP: isSignedIn removed — AI features are open to guests during testing phase.
  // Re-add `isSignedIn: boolean` here and pass it from ShoppingListScreen to restore the gate.
};

export const CaretPopover = ({
  onAiSuggestions,
  onSavedSets,
  onRecord,
  onFromPhoto,
  onClose,
}: CaretPopoverProps) => {
  const { theme } = useTheme();
  const { t, isRTL } = useLocale();
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const actionAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const actions: SpeedDialAction[] = [
    { icon: 'albums-outline', label: t('caret.savedSets'), onPress: onSavedSets },
    { icon: 'mic-outline', label: t('caret.record'), onPress: onRecord },
    { icon: 'sparkles-outline', label: t('caret.aiSuggestions'), onPress: onAiSuggestions },
    { icon: 'camera-outline', label: t('caret.fromPhoto'), onPress: onFromPhoto },
  ];

  useEffect(() => {
    Animated.timing(backdropAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    const staggered = actionAnims.map((anim, i) =>
      Animated.spring(anim, {
        toValue: 1,
        tension: 280,
        friction: 14,
        useNativeDriver: true,
        delay: i * 35,
      })
    );
    Animated.stagger(35, staggered).start();
  }, []);

  const handleClose = () => {
    const reverseAnims = [...actionAnims].reverse().map((anim, i) =>
      Animated.timing(anim, {
        toValue: 0,
        duration: 80,
        delay: i * 20,
        useNativeDriver: true,
      })
    );
    Animated.parallel([
      ...reverseAnims,
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleAction = (action: SpeedDialAction) => {
    const reverseAnims = [...actionAnims].reverse().map((anim, i) =>
      Animated.timing(anim, {
        toValue: 0,
        duration: 70,
        delay: i * 15,
        useNativeDriver: true,
      })
    );
    Animated.parallel([
      ...reverseAnims,
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      action.onPress();
    });
  };

  const baseOffset = 70;
  const spacing = 60;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(0,0,0,0.3)',
            opacity: backdropAnim,
            zIndex: 15,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Speed dial actions */}
      {actions.map((action, index) => {
        const anim = actionAnims[index];
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(baseOffset + index * spacing)],
        });
        const scale = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.3, 1.05, 1],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, 0.8, 1],
        });

        return (
          <Animated.View
            key={action.label}
            style={{
              position: 'absolute',
              ...(isRTL ? { left: 20 } : { right: 20 }),
              bottom: 28,
              zIndex: 18,
              flexDirection: 'row',
              alignItems: 'center',
              transform: [{ translateY }, { scale }],
              opacity,
            }}
          >
            {(() => {
              const bgColor = action.disabled ? theme.colors.surfaceHighlight : theme.colors.surface;
              const label = (
                <Animated.View
                  style={{
                    marginRight: 12,
                    backgroundColor: bgColor,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOpacity: action.disabled ? 0 : 0.1,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: action.disabled ? 0 : 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: theme.fonts.semibold,
                      color: action.disabled ? theme.colors.textSecondary : theme.colors.text,
                    }}
                  >
                    {action.label}
                  </Text>
                </Animated.View>
              );
              const iconBtn = (
                <Pressable
                  onPress={() => handleAction(action)}
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: bgColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOpacity: action.disabled ? 0 : pressed ? 0.05 : 0.14,
                    shadowRadius: pressed ? 4 : 8,
                    shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                    elevation: action.disabled ? 0 : pressed ? 2 : 6,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Ionicons
                    name={action.icon}
                    size={22}
                    color={action.disabled ? theme.colors.textSecondary : theme.colors.primary}
                  />
                </Pressable>
              );
              return isRTL ? <>{iconBtn}{label}</> : <>{label}{iconBtn}</>;
            })()}
          </Animated.View>
        );
      })}
    </>
  );
};
