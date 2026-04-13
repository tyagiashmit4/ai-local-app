import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { theme } from '../styles/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface VoiceWaveAnimationProps {
  isActive: boolean;
  color?: string;
  barCount?: number;
  width?: number;
  height?: number;
}

export const VoiceWaveAnimation: React.FC<VoiceWaveAnimationProps> = ({
  isActive,
  color = theme.colors.primary,
  barCount = 7,
  width = 120,
  height = 50,
}) => {
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isActive) {
      const loopAnimations = animations.map((anim, index) => {
        // Each bar has a different min/max and speed for organic feel
        const minScale = 0.15 + Math.random() * 0.15;
        const maxScale = 0.6 + Math.random() * 0.4;
        const duration = 300 + index * 80 + Math.random() * 200;

        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: maxScale,
              duration: duration,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: minScale,
              duration: duration + 50,
              useNativeDriver: false,
            }),
          ])
        );
      });

      // Stagger the start of each bar
      loopAnimations.forEach((anim, index) => {
        setTimeout(() => anim.start(), index * 60);
      });

      return () => {
        loopAnimations.forEach(anim => anim.stop());
      };
    } else {
      // Smoothly settle to small height when not active
      animations.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0.15,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isActive, animations]);

  const barWidth = Math.max(3, (width / barCount) * 0.5);
  const gap = (width - barWidth * barCount) / (barCount + 1);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {animations.map((anim, index) => {
          const x = gap + index * (barWidth + gap);
          const barHeight = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, height],
          });
          const barY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [height / 2, 0],
          });

          return (
            <AnimatedRect
              key={index}
              x={x}
              y={barY}
              width={barWidth}
              height={barHeight}
              rx={barWidth / 2}
              ry={barWidth / 2}
              fill={color}
              opacity={isActive ? 0.9 : 0.3}
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
