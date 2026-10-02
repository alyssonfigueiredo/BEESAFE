import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

const BUCKET = "avatares";

/**
 * Foto de perfil: privada, só aparece na tela Perfil de quem a enviou (migration 33). O bucket
 * não é público, então a imagem vem por URL assinada, renovada a cada abertura.
 */
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar", path],
    enabled: !!path,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useChangeAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) throw new Error("Precisa liberar o acesso às fotos para enviar.");
      const escolha = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      });
      if (escolha.canceled) return;

      const { data: sessao } = await supabase.auth.getUser();
      const uid = sessao.user?.id;
      if (!uid) throw new Error("Entre na sua conta para enviar foto.");

      // Caminho novo a cada troca: a URL assinada antiga não fica presa em cache.
      const path = `${uid}/avatar-${Date.now()}.jpg`;
      const bytes = await (await fetch(escolha.assets[0].uri)).arrayBuffer();
      const { error: up } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: "image/jpeg" });
      if (up) throw new Error(up.message);
      const { data: antes } = await supabase.from("profiles").select("avatar_path").maybeSingle();
      const { error } = await supabase.rpc("set_my_avatar", { p_path: path });
      if (error) throw new Error(error.message);
      if (antes?.avatar_path) await supabase.storage.from(BUCKET).remove([antes.avatar_path]);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useRemoveAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.rpc("set_my_avatar", { p_path: null });
      if (error) throw new Error(error.message);
      await supabase.storage.from(BUCKET).remove([path]);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
}
