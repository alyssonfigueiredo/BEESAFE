import { Tabs } from "expo-router";
import { Home, LifeBuoy, Map, PlusCircle, User } from "lucide-react-native";

import { EmergencyButton } from "@/components/EmergencyButton";
import { Logo } from "@/components/Logo";
import { colors, fonts } from "@/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.night },
        headerTitle: () => <Logo size="sm" />,
        headerTitleAlign: "left",
        headerRight: () => <EmergencyButton />,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.night },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.coral,
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
        name="registrar"
        options={{
          title: "Registrar",
          tabBarIcon: ({ color }) => <PlusCircle color={color} size={22} />,
        }}
      />
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
