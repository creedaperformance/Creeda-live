import React from 'react';
import { View, Text } from 'react-native';

export const NeonGlassCardNative = ({ children, watermark }: { children: React.ReactNode; watermark?: string }) => {
  return (
    <View className="rounded-3xl border border-white/5 bg-background-glass overflow-hidden p-6 my-2 relative">
      {/* Fake Aura Blob behind using absolute positioning & opacity */}
      <View className="absolute -top-[50%] -left-[20%] w-[150%] h-[150%] bg-[#FF5F1F] opacity-[0.03] rounded-full blur-[50px] pointer-events-none" />
      
      {watermark && (
        <Text className="absolute top-4 right-4 text-7xl font-black text-white/[0.02] tracking-tighter">
          {watermark}
        </Text>
      )}

      {children}
    </View>
  );
}
