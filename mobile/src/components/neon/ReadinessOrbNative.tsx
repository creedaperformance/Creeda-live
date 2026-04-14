import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Group, Circle, SweepGradient, Blur, Shadow, mix, vec } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

type OrbProps = {
  score: number;
  size?: number;
};

export const ReadinessOrbNative = ({ score, size = 160 }: OrbProps) => {
  const isHigh = score > 75;
  const isMid = score >= 50 && score <= 75;
  
  const baseColor = isHigh ? '#00E5FF' : isMid ? '#FF5F1F' : '#EF4444';
  const glowColor = isHigh ? 'rgba(0, 229, 255, 0.6)' : isMid ? 'rgba(255, 95, 31, 0.6)' : 'rgba(239, 68, 68, 0.6)';
  const secondaryColor = isHigh ? '#0077FF' : isMid ? '#FF2A00' : '#880000';

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.75; // inner orb

  const blurRadius = useDerivedValue(() => {
    return mix(progress.value, 10, 25);
  });

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ flex: 1 }}>
        <Group>
          {/* Breathing Aura */}
          <Circle cx={cx} cy={cy} r={r}>
            <Shadow dx={0} dy={0} blur={blurRadius} color={glowColor} inner={false} />
            <Shadow dx={0} dy={0} blur={blurRadius} color={glowColor} inner={true} />
            
            <SweepGradient
              c={vec(cx, cy)}
              colors={[baseColor, secondaryColor, baseColor]}
            />
          </Circle>
        </Group>
      </Canvas>
    </View>
  );
};
