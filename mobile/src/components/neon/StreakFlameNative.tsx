import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Canvas, Circle, LinearGradient, vec, Path, Blur } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

export const StreakFlameNative = ({ intensity }: { intensity: number }) => {
  const flicker = useSharedValue(0);

  useEffect(() => {
    flicker.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, []);

  const baseOpacity = 0.3 + intensity * 0.7;

  return (
    <View style={{ width: 40, height: 60 }} className="justify-end items-center relative">
      <Canvas style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Circle cx={20} cy={30} r={20} opacity={0.2 + intensity * 0.5}>
          <Blur blur={15} />
          <LinearGradient
            start={vec(20, 0)}
            end={vec(20, 60)}
            colors={['transparent', 'rgba(255,95,31,0.5)']}
          />
        </Circle>
      </Canvas>
    </View>
  );
};
