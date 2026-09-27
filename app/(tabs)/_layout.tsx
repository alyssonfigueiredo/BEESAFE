import { Tabs } from "expo-router";
import { Home, LifeBuoy, Map, Store, User } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmergencyButton } from "@/components/EmergencyButton";
import { Glass } from "@/components/Glass";
import { Logo } from "@/components/Logo";
import { TabIcon } from "@/components/TabIcon";
import { colors, fonts, glass, tabColors } from "@/theme/tokens";

export default function TabsLayout() {
  const safe = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // Cabeçalho e barra em vidro: o conteúdo passa por baixo (cada tela usa useScreenInsets).
        headerTransparent: true,
        headerStyle: { backgroundColor: "transparent" },
        headerBackground: () => <Glass style={StyleSheet.absoluteFill} />,
        headerTitle: () => <Logo size="sm" />,
        headerTitleAlign: "left",
        headerRight: () => <EmergencyButton />,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.paper },
        // A barra flutua: cápsula solta das bordas, sem linha em cima, sem fundo próprio.
        // (paddingBottom 0 anula a área segura que a barra somaria por conta própria.)
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: safe.bottom + glass.tabBarGap,
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
        // Lente: a aba ativa ganha uma cápsula branca que desliza; a cor vem de cada aba.
        tabBarItemStyle: {
          paddingVertical: 6,
          marginVertical: 5,
          marginHorizontal: 4,
          borderRadius: glass.radius - 5,
        },
        tabBarActiveBackgroundColor: colors.solid,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarActiveTintColor: tabColors.index,
          title: "Início",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home} color={color} focused={focused} active={tabColors.index} />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          tabBarActiveTintColor: tabColors.mapa,
          title: "Mapa",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Map} color={color} focused={focused} active={tabColors.mapa} />
          ),
        }}
      />
      <Tabs.Screen
        name="lugares"
        options={{
          tabBarActiveTintColor: tabColors.lugares,
          title: "Lugares",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Store} color={color} focused={focused} active={tabColors.lugares} />
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
            <TabIcon icon={LifeBuoy} color={color} focused={focused} active={tabColors.apoio} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarActiveTintColor: tabColors.perfil,
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={User} color={color} focused={focused} active={tabColors.perfil} />
          ),
        }}
      />
    </Tabs>
  );
}
