import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonProps = {
  title: string;
  variant?: 'saffron' | 'chakra';
  onPress: () => void;
  icon?: React.ReactNode;
};

export const GlowingButtonNative = ({ title, variant = 'saffron', onPress, icon }: ButtonProps) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  const isSaffron = variant === 'saffron';
  const color = isSaffron ? '#FF5F1F' : '#00E5FF';

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity.value,
      shadowRadius: 15,
      elevation: 10,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { stiffness: 400, damping: 17 });
    glowOpacity.value = withTiming(0.8, { duration: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 400, damping: 17 });
    glowOpacity.value = withTiming(0.4, { duration: 300 });
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.button,
        rStyle,
        { borderColor: isSaffron ? 'rgba(255,95,31,0.4)' : 'rgba(0,229,255,0.4)' }
      ]}
      className="bg-background-elevated self-center rounded-2xl flex-row items-center justify-center border"
    >
      {icon}
      <Text
        className="font-bold uppercase tracking-widest ml-2"
        style={{ color }}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
});
