import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { logEvent } from "@/lib/events";
import { colors } from "@/theme/tokens";

type Props = { children: ReactNode };
type State = { crashed: boolean };

/**
 * Hoje o app não tem ErrorBoundary nenhum: um erro de render em qualquer tela derruba o app
 * inteiro sem aviso (análise de ponta a ponta, 15/10/2026). Esta é a rede de segurança do app
 * todo — fica por cima de tudo em app/_layout.tsx. Não substitui observabilidade de verdade
 * (não manda o erro pra lugar nenhum fora deste aparelho), só impede a tela branca/fechamento.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    if (__DEV__) console.error("ErrorBoundary pegou:", error);
    logEvent("erro");
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-paper px-8">
        <Text className="font-display text-2xl uppercase text-ink">Algo deu errado</Text>
        <Text className="text-center font-body text-base text-dim">
          Essa tela travou. Tente de novo — o resto do app continua funcionando normalmente.
        </Text>
        <Pressable
          onPress={() => this.setState({ crashed: false })}
          className="rounded-full bg-turquoise px-8 py-3 active:opacity-80"
        >
          <Text className="font-body-bold text-base" style={{ color: colors.ink }}>
            Tentar de novo
          </Text>
        </Pressable>
      </View>
    );
  }
}
