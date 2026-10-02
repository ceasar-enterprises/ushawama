/**
 * IOSTabBar — a UIKit-style floating tab bar: translucent frosted glass,
 * SF-Symbols-style Ionicons, springy press feedback and haptics.
 * Compact by default; it only enlarges (bar + tapped tab) when interacted with.
 */

import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize } from '../theme';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ASSETS: Record<string, { icon: IonName; iconOutline: IonName; label: string; color: string }> = {
  Dashboard: { icon: 'home', iconOutline: 'home-outline', label: 'Home', color: Colors.primary },
  Duty: { icon: 'calculator', iconOutline: 'calculator-outline', label: 'Duty', color: Colors.accent },
  Learn: { icon: 'book', iconOutline: 'book-outline', label: 'Learn', color: Colors.secondary },
  Trade: { icon: 'storefront', iconOutline: 'storefront-outline', label: 'Trade', color: Colors.info },
  Ops: { icon: 'cube', iconOutline: 'cube-outline', label: 'Center', color: Colors.primaryLight },
  Profile: { icon: 'person', iconOutline: 'person-outline', label: 'Me', color: Colors.level4 },
};

const PILL_WIDTH = 24;
const PILL_TOP = 30;
const BAR_H_COMPACT = 52;
const BAR_H_EXPANDED = 66;

export default function IOSTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const routes = state.routes as { key: string; name: string }[];
  const count = routes.length;
  const [barWidth, setBarWidth] = useState(0);
  const indicator = useRef(new Animated.Value(state.index)).current;
  const barHeight = useRef(new Animated.Value(BAR_H_COMPACT)).current;

  const seg = barWidth / count;
  const activeColor = TAB_ASSETS[routes[state.index]?.name]?.color || Colors.primary;
  const pillOffset = Math.max(0, (seg - PILL_WIDTH) / 2);
  const indicatorLeft = indicator.interpolate({
    inputRange: [0, Math.max(1, count - 1)],
    outputRange: [pillOffset, pillOffset + (count - 1) * seg],
    extrapolate: 'clamp',
  });

  const onPressTab = (route: { key: string; name: string }, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const springTo = (target: number) => {
    Animated.spring(indicator, {
      toValue: target,
      friction: 9,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  const expand = () => {
    Animated.timing(barHeight, {
      toValue: BAR_H_EXPANDED,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const collapse = () => {
    Animated.timing(barHeight, {
      toValue: BAR_H_COMPACT,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const onItemPress = (index: number, route: { key: string; name: string }, isFocused: boolean) => {
    springTo(index);
    onPressTab(route, isFocused);
  };

  const barStyle = [
    styles.bar,
    { height: barHeight },
    Platform.OS === 'web' && { backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any,
  ];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}
    >
      <Animated.View style={barStyle} onLayout={e => setBarWidth(e.nativeEvent.layout.width)}>
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                backgroundColor: activeColor,
                transform: [{ translateX: indicatorLeft }],
              },
            ]}
          />
        )}
        {routes.map((route, index) => {
          const options = (descriptors as any)[route.key]?.options;
          const asset = TAB_ASSETS[route.name] ?? {
            icon: 'ellipse' as IonName,
            iconOutline: 'ellipse-outline' as IonName,
            label: options?.title ?? route.name,
            color: Colors.primary,
          };
          const isFocused = state.index === index;
          return (
            <TabItem
              key={route.key}
              asset={asset}
              isFocused={isFocused}
              label={asset.label}
              onPress={() => onItemPress(index, route, isFocused)}
              onExpand={expand}
              onCollapse={collapse}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

function TabItem({
  asset,
  isFocused,
  label,
  onPress,
  onExpand,
  onCollapse,
}: {
  asset: { icon: IonName; iconOutline: IonName; label: string; color: string };
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const hoverScale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const pressIn = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    setPressed(true);
    onExpand();
    Animated.spring(pressScale, {
      toValue: 1.14,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const pressOut = () => {
    setPressed(false);
    onCollapse();
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 240,
    }).start();
  };

  const hoverIn = () => {
    Animated.spring(hoverScale, {
      toValue: 1.08,
      useNativeDriver: true,
      friction: 5,
      tension: 200,
    }).start();
  };

  const hoverOut = () => {
    Animated.spring(hoverScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 200,
    }).start();
  };

  const tint = isFocused ? asset.color : Colors.textMuted;
  const outline = !isFocused;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      onHoverIn={hoverIn}
      onHoverOut={hoverOut}
      style={styles.item}
    >
      <Animated.View
        style={{ transform: [{ scale: pressScale }, { scale: hoverScale }], alignItems: 'center' }}
      >
        <Ionicons
          name={outline ? asset.iconOutline : asset.icon}
          size={19}
          color={asset.color}
          style={!isFocused && { opacity: 0.5 }}
        />
      </Animated.View>
      <Text style={[styles.label, { color: isFocused ? asset.color : Colors.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    marginHorizontal: 30,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.55)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      web: {
        boxShadow: '0 12px 30px rgba(0,30,18,0.14)',
      },
      default: {
        elevation: 14,
      },
    }),
  },
  pill: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    width: PILL_WIDTH,
    height: 3,
    borderRadius: 1.5,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  label: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
  },
});