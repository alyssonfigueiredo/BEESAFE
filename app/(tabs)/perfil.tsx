import { Pressable, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export default function PerfilScreen() {
  const { session } = useAuth();
  return (
    <View className="flex-1 gap-4 bg-night px-6 py-8">
      <Text className="font-display text-3xl uppercase tracking-widest text-ink">Perfil</Text>
      <Text className="font-body text-base text-muted">{session?.user.email}</Text>
      <Text className="font-body text-sm text-dim">
        Cidade padrão, apelido do mural e exclusão de conta chegam na fase 3.
      </Text>
      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="mt-auto items-center rounded-xl border border-border py-3 active:opacity-80"
      >
        <Text className="font-heading text-base uppercase tracking-widest text-muted">Sair</Text>
      </Pressable>
    </View>
  );
}
