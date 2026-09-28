import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  role: "user" | "moderator" | "admin";
  nickname: string | null;
  default_city_id: number | null;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      // ensure_my_profile (migration 18) cria a linha se faltar. Sem a migration no banco, cai no
      // select direto — que devolve null em vez de erro quando a linha não existe.
      const ensured = await supabase.rpc("ensure_my_profile");
      if (!ensured.error) return ensured.data as Profile;
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nickname: string; defaultCityId: number | null }) => {
      const nickname = input.nickname.trim();
      if (nickname.length > 40) throw new Error("O apelido pode ter no máximo 40 caracteres.");
      const { error } = await supabase.rpc("update_my_profile", {
        p_nickname: nickname,
        p_default_city_id: input.defaultCityId,
      });
      if (error) throw error;
      // Antes da migration 18 a função só fazia UPDATE e não avisava quando não havia linha:
      // confere se gravou de verdade.
      const { data } = await supabase.from("profiles").select("nickname").maybeSingle();
      if (!data || (data.nickname ?? "") !== nickname)
        throw new Error("O apelido não foi salvo. Tente de novo em instantes.");
    },
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut();
    },
  });
}
