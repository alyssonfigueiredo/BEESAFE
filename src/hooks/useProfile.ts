import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
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
      const { data, error } = await supabase.from("profiles").select("*").single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nickname: string; defaultCityId: number | null }) => {
      const { error } = await supabase.rpc("update_my_profile", {
        p_nickname: input.nickname,
        p_default_city_id: input.defaultCityId,
      });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/**
 * Exclui a conta pela Edge Function delete-account, que revoga o "Entrar com a Apple" na Apple
 * antes de apagar (regra 5.1.1 da App Store). Se a função não estiver publicada ou não responder
 * e a conta NÃO for da Apple, cai na RPC delete_my_account (só apaga no banco). Conta da Apple
 * nunca cai no fallback: sem revogar, a exclusão não é completa.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const isApple = (userData.user?.identities ?? []).some((i) => i.provider === "apple");

      const { data, error } = await supabase.functions.invoke<{
        deleted?: boolean;
        error?: string;
      }>("delete-account", { method: "POST" });
      if (!error && data?.deleted) {
        await supabase.auth.signOut();
        return;
      }

      const unreachable =
        error instanceof FunctionsFetchError ||
        error instanceof FunctionsRelayError ||
        (error instanceof FunctionsHttpError && error.context?.status === 404);
      if (!unreachable || isApple) {
        const detail = await describeFunctionError(error, data);
        throw new Error(
          isApple
            ? `Não foi possível desvincular sua conta Apple. ${detail}`.trim()
            : detail || "Tente de novo.",
        );
      }

      const { error: rpcError } = await supabase.rpc("delete_my_account");
      if (rpcError) throw rpcError;
      await supabase.auth.signOut();
    },
  });
}

async function describeFunctionError(
  error: unknown,
  data: { error?: string } | null,
): Promise<string> {
  if (data?.error) return data.error;
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body?.error) return String(body.error);
  }
  return error instanceof Error ? error.message : "";
}
