import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/tokens";

// Destino do deep link irisa://auth/callback. Chega aqui por dois caminhos:
// - login com Google: a troca do código já acontece em socialAuth.ts (o navegador devolve a URL
//   para a sessão de login); aqui não há nada a fazer além de voltar para as tabs;
// - link de confirmação do e-mail de cadastro: a conta já foi confirmada no servidor, e o link
//   traz um código. Se foi aberto no mesmo aparelho em que a conta foi criada, trocamos o código
//   pela sessão e a pessoa já entra. Em outro aparelho a troca falha (falta o verificador do PKCE)
//   e ela cai no login, com a conta confirmada.
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [pronto, setPronto] = useState(!code);

  useEffect(() => {
    if (!code) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) await supabase.auth.exchangeCodeForSession(code).catch(() => null);
      if (vivo) setPronto(true);
    })();
    return () => {
      vivo = false;
    };
  }, [code]);

  if (!pronto)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.paper,
        }}
      >
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  return <Redirect href="/" />;
}
