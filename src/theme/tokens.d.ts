import type { ViewStyle } from "react-native";

export declare const colors: {
  paper: string;
  surface: string;
  subtle: string;
  solid: string;
  border: string;
  night: string;
  ink: string;
  muted: string;
  dim: string;
  coral: string;
  orange: string;
  yellow: string;
  turquoise: string;
  lilac: string;
  coralInk: string;
  orangeInk: string;
  yellowInk: string;
  turquoiseInk: string;
  lilacInk: string;
  amber: string;
};
export declare const mark: {
  ring: string[];
  sweep: string;
  pupil: string;
};
export declare const fonts: {
  wordmark: string;
  display: string;
  heading: string;
  body: string;
  bodyMedium: string;
  bodyBold: string;
};
export declare const glass: {
  tint: string;
  tintStrong: string;
  edge: string;
  tabBarHeight: number;
  tabBarGap: number;
  radius: number;
};
export declare const accents: Record<
  | "coral"
  | "orange"
  | "yellow"
  | "turquoise"
  | "lilac"
  | "coralInk"
  | "orangeInk"
  | "yellowInk"
  | "turquoiseInk"
  | "lilacInk"
  | "amber",
  string
>;
export declare const SATURATION: number;
export declare function saturate(hex: string, k?: number): string;
export declare const shadow: {
  card: ViewStyle;
  lift: ViewStyle;
  turquoise: ViewStyle;
  coral: ViewStyle;
  yellow: ViewStyle;
  lilac: ViewStyle;
};
export declare const aurora: { x: number; y: number; r: number; color: string; alpha: number }[];
export declare const tabColors: Record<"index" | "mapa" | "lugares" | "apoio" | "perfil", string>;
