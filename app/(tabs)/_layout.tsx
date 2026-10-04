import { Tabs } from "expo-router";
import { Home, LifeBuoy, Map, Store, User } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiscoveryNudge } from "@/components/DiscoveryNudge";
import { EmergencyButton } from "@/components/EmergencyButton";
import { Glass } from "@/components/Glass";
import { Logo } from "@/components/Logo";
import { TabIcon } from "@/components/TabIcon";
import { tabBarBottom } from "@/hooks/useScreenInsets";
import { useTourTarget } from "@/hooks/useTour";
import { colors, fonts, glass, tabColors } from "@/theme/tokens";

function TabButton({
  children,
  style,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  tourId,
}: {
  /** Id do alvo no tour de boas-vindas ("tab-mapa", "tab-apoio"…). */
  tourId: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: PressableProps["onPress"];
  onLongPress?: PressableProps["onLongPress"];
  accessibilityState?: { selected?: boolean };
  accessibilityLabel?: string;
  testID?: string;
}) {
  const on = !!accessibilityState?.selected;
  const tourRef = useTourTarget(tourId);
  // A lente é uma camada própria com raio = metade do lado menor, medido na tela. Antes o raio era
  // fixo e o fundo ficava no mesmo View do conteúdo com overflow hidden: nas abas da ponta (Início e
  // Perfil) o Android desenhava a lente quadrada.
  const [size, setSize] = useState({ w: 0, h: 0 });
  const radius = size.w && size.h ? Math.min(size.w, size.h) / 2 : glass.radius - 5;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[style, { flex: 1, backgroundColor: "transparent" }]}
    >
      <View
        ref={tourRef}
        collapsable={false}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{
          flex: 1,
          marginVertical: 5,
          marginHorizontal: 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {on && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: radius,
              borderCurve: "continuous",
              backgroundColor: colors.solid,
            }}
          />
        )}
        {children}
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const safe = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={({ route }) => ({
          // Cabeçalho e barra em vidro: o conteúdo passa por baixo (cada tela usa useScreenInsets).
          // Cabeçalho em cápsula de vidro solta das bordas, como a barra de abas.
          headerTransparent: true,
          headerStyle: {
            backgroundColor: "transparent",
            height: safe.top + 8 + glass.headerHeight + 8,
          },
          headerBackground: () => (
            <Glass
              style={{
                position: "absolute",
                left: glass.side,
                right: glass.side,
                top: safe.top + 8,
                height: glass.headerHeight,
                borderRadius: glass.headerHeight / 2,
              }}
            />
          ),
          headerTitle: () => <Logo size="sm" />,
          headerTitleAlign: "left",
          headerTitleContainerStyle: { marginLeft: glass.side + 16 },
          headerRightContainerStyle: { paddingRight: glass.side - 8 },
          headerRight: () => <EmergencyButton />,
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: colors.paper },
          // A barra flutua: cápsula solta das bordas, sem linha em cima, sem fundo próprio.
          // (paddingBottom 0 anula a área segura que a barra somaria por conta própria.)
          tabBarStyle: {
            position: "absolute",
            left: glass.side,
            right: glass.side,
            bottom: tabBarBottom(safe.bottom),
            height: glass.tabBarHeight,
            borderRadius: glass.radius,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            paddingTop: 0,
            paddingBottom: 0,
            elevation: 0,
            shadowColor: colors.night,
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
          },
          tabBarBackground: () => (
            <Glass style={[StyleSheet.absoluteFill, { borderRadius: glass.radius }]} />
          ),
          // Lente: a aba ativa ganha uma cápsula branca; a cor vem de cada aba. A lente é desenhada
          // por TabButton (a cor de fundo nativa da aba ignora o raio e escapava como um quadrado).
          tabBarButton: (props) => <TabButton {...props} tourId={`tab-${route.name}`} />,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.dim,
          tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarActiveTintColor: tabColors.index,
            title: "Início",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={Home}
                color={color}
                focused={focused}
                active={tabColors.index}
                name="index"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="mapa"
          options={{
            tabBarActiveTintColor: tabColors.mapa,
            title: "Mapa",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={Map}
                color={color}
                focused={focused}
                active={tabColors.mapa}
                name="mapa"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="lugares"
          options={{
            tabBarActiveTintColor: tabColors.lugares,
            title: "Lugares",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={Store}
                color={color}
                focused={focused}
                active={tabColors.lugares}
                name="lugares"
              />
            ),
          }}
        />
        {/* Registrar saiu da barra: o botão vermelho no Início e no Mapa leva até aqui. A rota
          continua existindo para esses links. */}
        <Tabs.Screen name="registrar" options={{ href: null }} />
        <Tabs.Screen
          name="apoio"
          options={{
            tabBarActiveTintColor: tabColors.apoio,
            title: "Apoio",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={LifeBuoy}
                color={color}
                focused={focused}
                active={tabColors.apoio}
                name="apoio"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            tabBarActiveTintColor: tabColors.perfil,
            title: "Perfil",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={User}
                color={color}
                focused={focused}
                active={tabColors.perfil}
                name="perfil"
              />
            ),
          }}
        />
      </Tabs>
      {/* "Passou por aqui?": às vezes, acima da barra, só no Início e em Lugares. */}
      <DiscoveryNudge />
    </View>
  );
}
