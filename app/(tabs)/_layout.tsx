import { Tabs } from "expo-router";
import { Home, LifeBuoy, Map, Store, User } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmergencyButton } from "@/components/EmergencyButton";
import { Glass } from "@/components/Glass";
import { Logo } from "@/components/Logo";
import { colors, fonts, glass } from "@/theme/tokens";

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
        tabBarItemStyle: { paddingVertical: 6, borderRadius: glass.radius - 5 },
        tabBarActiveTintColor: colors.coralInk,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Início", tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="mapa"
        options={{ title: "Mapa", tabBarIcon: ({ color }) => <Map color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="lugares"
        options={{
          title: "Lugares",
          tabBarIcon: ({ color }) => <Store color={color} size={22} />,
        }}
      />
      {/* Registrar saiu da barra: o botão vermelho no Início e no Mapa leva até aqui. A rota
          continua existindo para esses links. */}
      <Tabs.Screen name="registrar" options={{ href: null }} />
      <Tabs.Screen
        name="apoio"
        options={{
          title: "Apoio",
          tabBarIcon: ({ color }) => <LifeBuoy color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: ({ color }) => <User color={color} size={22} /> }}
      />
    </Tabs>
  );
}
