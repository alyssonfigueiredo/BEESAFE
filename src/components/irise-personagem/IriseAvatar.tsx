import { Image, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useBustoResolvido } from "@/hooks/useIrisePersonagens";
import { BUSTO_ASPECTO } from "@/lib/irisePersonagens";
import { colors } from "@/theme/tokens";

const ANEL_ARCOIRIS = require("../../../assets/irise-personagens/anel-arcoiris.png");

/**
 * Avatar da referência aprovada (pacote 13 + respostas do pacote 14): anel arco-íris de 2,4% do
 * tamanho, PARADO (decisão do design, dúvida 2), fundo radial claro com sombra lilás no círculo,
 * busto a 118% da área interna cortado pela curva de baixo — a cabeça passa por cima da borda.
 * Altura total = size * 1.3. Não substitui o Busto (que continua nos cartões pequenos).
 */
export function IriseAvatar({
  personagem,
  pose = 1,
  size,
  anel = true,
  cinza = false,
  fundo = "claro",
}: {
  personagem: number;
  pose?: number;
  size: number;
  anel?: boolean;
  /** Vizinhos do carrossel: a mesma imagem tingida de cinza por cima (tintColor funciona no iOS
   * e no Android; o `filter: grayscale` do RN é só Android). Anel e fundo ficam como são. */
  cinza?: boolean;
  /** Pra usar em cima do card/faixa/pílula escuros (personagem fora dos 9 originais, que não tem
   * a versão `avatar-card`/`-escuro` pronta — ver `iriseImagensEscuras.ts`). O miolo do anel vira
   * a cor do card em vez do degradê claro; o resto não muda. */
  fundo?: "claro" | "escuro";
}) {
  const altura = size * 1.3;
  const espessura = size * 0.024;
  const interno = size - espessura * 2;
  const r = interno / 2;
  const imgW = interno * 1.18;
  const imgH = imgW * BUSTO_ASPECTO;
  const { source, onError } = useBustoResolvido(pose, personagem);

  return (
    <View style={{ width: size, height: altura }}>
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          boxShadow: "0 24px 50px rgba(96,55,240,0.18)",
        }}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="iaFundo" cx="50%" cy="28%" r="78%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#ECE5FF" />
            </RadialGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - espessura / 2}
            fill={fundo === "escuro" ? "#171A2B" : "url(#iaFundo)"}
            stroke={anel ? "none" : colors.border}
            strokeWidth={espessura}
          />
        </Svg>
        {anel && (
          <Image source={ANEL_ARCOIRIS} style={{ position: "absolute", width: size, height: size }} />
        )}
      </View>
      <View
        style={{
          position: "absolute",
          left: espessura,
          right: espessura,
          top: 0,
          bottom: espessura,
          overflow: "hidden",
          borderBottomLeftRadius: r,
          borderBottomRightRadius: r,
        }}
      >
        <Image
          source={source}
          onError={onError}
          style={{ position: "absolute", top: 0, left: (interno - imgW) / 2, width: imgW, height: imgH }}
          resizeMode="cover"
        />
        {cinza && (
          <Image
            source={source}
            tintColor="#C9CFDA"
            style={{
              position: "absolute",
              top: 0,
              left: (interno - imgW) / 2,
              width: imgW,
              height: imgH,
              opacity: 0.55,
            }}
            resizeMode="cover"
          />
        )}
      </View>
    </View>
  );
}
