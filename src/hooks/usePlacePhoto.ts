import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

const BUCKET = "fotos-lugares";

/** A foto nasce "pendente": só vai ao ar depois da revisão. Use no aviso após o envio. */
export const FOTO_EM_REVISAO =
  "Obrigado! Sua foto está em revisão e aparece na ficha assim que for aprovada.";

/**
 * Foto do lugar tirada por quem avalia. É a melhor fonte que a Irisa tem: atual, do jeito que o
 * lugar é, e da comunidade — a do Google é alugada (vence e gasta cota) e a do Mapillary é
 * fachada de rua tirada de passagem.
 *
 * Caminho no Storage: `<place_id>/<user_id>/foto.jpg`. O `user_id` na pasta é o que garante que
 * ninguém sobrescreve a foto de outra pessoa (policy da migration 24); ele nunca aparece no app.
 */
export function useEnviarFotoDoLugar(placeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) throw new Error("Precisa liberar o acesso às fotos para enviar.");

      const escolha = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        // A ficha mostra a foto numa faixa larga; recortar no envio evita foto em pé cortada.
        aspect: [16, 9],
        quality: 0.7,
        exif: false,
      });
      if (escolha.canceled) return null;

      const arquivo = escolha.assets[0];
      const { data: sessao } = await supabase.auth.getUser();
      const uid = sessao.user?.id;
      if (!uid) throw new Error("Entre na sua conta para enviar foto.");

      const caminho = `${placeId}/${uid}/foto.jpg`;
      const bytes = await (await fetch(arquivo.uri)).arrayBuffer();
      const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
      if (erroUpload) throw new Error(erroUpload.message);

      const { data: publica } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
      // `?v=` força o app a recarregar quando a pessoa troca a foto (mesmo caminho, imagem nova).
      const url = `${publica.publicUrl}?v=${Date.now()}`;

      const { error } = await supabase
        .from("place_photos")
        .upsert({ place_id: placeId, url, path: caminho }, { onConflict: "place_id,user_id" });
      if (error) throw new Error(error.message);
      return url;
    },

    onSuccess: (url) => {
      if (!url) return;
      client.invalidateQueries({ queryKey: ["place", placeId] });
      client.invalidateQueries({ queryKey: ["places"] });
      client.invalidateQueries({ queryKey: ["places-busca"] });
      client.invalidateQueries({ queryKey: ["welcoming"] });
    },
  });
}
