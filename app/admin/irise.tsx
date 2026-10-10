import { router, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Plus, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { Aurora } from "@/components/Aurora";
import { Busto } from "@/components/irise-personagem/Busto";
import {
  useAdminIriseFotoEnviar,
  useAdminIrisePersonagemExcluir,
  useAdminIrisePersonagemSalvar,
  useAdminIrisePersonagens,
  type IrisePersonagemAdmin,
  type IrisePersonagemForm,
} from "@/hooks/useIrisePersonagens";
import { useProfile } from "@/hooks/useProfile";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { STATS } from "@/lib/irisePersonagens";
import { colors, shadow } from "@/theme/tokens";

const VAZIO: IrisePersonagemForm = {
  n: 0,
  nome: "",
  pronomes: "",
  classe: "",
  bio: "",
  stats: [3, 3, 3, 3],
  ativo: true,
};

function paraForm(p: IrisePersonagemAdmin): IrisePersonagemForm {
  return {
    n: p.n,
    nome: p.nome,
    pronomes: p.pronomes,
    classe: p.classe,
    bio: p.bio,
    stats: [p.stat_acolhimento, p.stat_humor, p.stat_papo_reto, p.stat_role],
    ativo: p.ativo,
  };
}

/**
 * CRUD dos personagens do irise, sem precisar de build (migration 71). Só pra quem é admin — não
 * moderação: trocar o elenco é decisão de produto, não de moderar conteúdo.
 */
export default function AdminIriseScreen() {
  const insets = useScreenInsets({ tabs: false });
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === "admin";
  const { data: personagens = [], isLoading } = useAdminIrisePersonagens();
  const [editando, setEditando] = useState<IrisePersonagemForm | null>(null);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (profile && !isAdmin) {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/perfil");
    }
  }, [profile, isAdmin]);

  function abrirNovo() {
    const proximo = personagens.length > 0 ? Math.max(...personagens.map((p) => p.n)) + 1 : 1;
    setCriando(true);
    setEditando({ ...VAZIO, n: proximo });
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Voltar",
          title: "Personagens do irise",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: colors.ink,
        }}
      />
      <View className="flex-1">
        <Aurora />
        {!isAdmin ? null : (
          <ScrollView className="flex-1" contentContainerClassName="gap-3 px-4" contentContainerStyle={insets}>
            <Pressable
              onPress={abrirNovo}
              className="h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-turquoise active:opacity-80"
              style={shadow.turquoise}
            >
              <Plus color={colors.night} size={18} />
              <Text className="font-body-bold text-sm text-night">Novo personagem</Text>
            </Pressable>

            {isLoading && <Text className="font-body text-dim">Carregando…</Text>}

            {personagens.map((p) => (
              <Pressable
                key={p.n}
                onPress={() => {
                  setCriando(false);
                  setEditando(paraForm(p));
                }}
                className="flex-row items-center gap-3 rounded-3xl bg-surface p-3.5 active:opacity-80"
                style={shadow.card}
              >
                <Busto personagem={p.n} size={48} />
                <View className="min-w-0 flex-1">
                  <Text className="font-body-bold text-[15px] text-ink">
                    {p.nome} <Text className="font-body text-xs text-dim">· nº {p.n}</Text>
                  </Text>
                  <Text className="font-body text-xs text-dim">{p.classe}</Text>
                </View>
                {!p.ativo && (
                  <View className="rounded-full bg-subtle px-2.5 py-1">
                    <Text className="font-body-bold text-[10px] uppercase text-dim">Inativo</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <EditorModal
        form={editando}
        criando={criando}
        existentes={personagens.map((p) => p.n)}
        onClose={() => setEditando(null)}
        onCriado={() => setCriando(false)}
      />
    </>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="font-body-bold text-[11px] uppercase tracking-wide text-dim">{label}</Text>
      {children}
    </View>
  );
}

const inputStyle = {
  borderRadius: 14,
  backgroundColor: colors.subtle,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 15,
  color: colors.ink,
};

function EditorModal({
  form,
  criando,
  existentes,
  onClose,
  onCriado,
}: {
  form: IrisePersonagemForm | null;
  criando: boolean;
  /** Números já em uso — pra barrar a criação com um número repetido (o banco faz upsert por
   * número: criar com um que já existe sobrescreveria o personagem de outra pessoa em silêncio). */
  existentes: number[];
  onClose: () => void;
  /** Depois de criar com sucesso: fica no modal, mas em modo edição (pra já poder subir as fotos
   * sem fechar e reabrir). */
  onCriado: () => void;
}) {
  const [local, setLocal] = useState<IrisePersonagemForm | null>(form);
  const salvar = useAdminIrisePersonagemSalvar();
  const excluir = useAdminIrisePersonagemExcluir();
  const enviarFoto = useAdminIriseFotoEnviar();

  // Sincroniza quando um personagem diferente é aberto (o modal não desmonta entre uma edição e
  // outra, só troca o `form` que vem de fora).
  if (form !== null && local?.n !== form.n) setLocal(form);
  if (form === null && local !== null) setLocal(null);

  if (!local) return null;

  function campo<K extends keyof IrisePersonagemForm>(chave: K, valor: IrisePersonagemForm[K]) {
    setLocal((l) => (l ? { ...l, [chave]: valor } : l));
  }

  async function onSalvar() {
    if (!local) return;
    if (!local.nome.trim() || !local.pronomes.trim() || !local.classe.trim() || !local.bio.trim()) {
      Alert.alert("Faltou preencher", "Nome, pronomes, classe e bio não podem ficar em branco.");
      return;
    }
    if (local.n < 1) {
      Alert.alert("Número inválido", "O número do personagem tem que ser maior que zero.");
      return;
    }
    if (criando && existentes.includes(local.n)) {
      Alert.alert(
        "Esse número já existe",
        "Escolha outro — salvar agora trocaria os dados do personagem que já tem esse número.",
      );
      return;
    }
    try {
      await salvar.mutateAsync(local);
      if (criando) onCriado();
      else onClose();
    } catch (e) {
      Alert.alert("Não deu pra salvar", e instanceof Error ? e.message : String(e));
    }
  }

  function onExcluir() {
    if (!local) return;
    Alert.alert(
      `Excluir ${local.nome || "este personagem"}?`,
      "Some do app pra sempre, com as fotos. Quem tinha escolhido esse personagem volta pra 'sem personagem'.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            excluir.mutate(local.n, {
              onSuccess: onClose,
              onError: (e) => Alert.alert("Não deu pra excluir", e.message),
            });
          },
        },
      ],
    );
  }

  async function trocarFoto(pose: number) {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert("Precisa liberar o acesso às fotos para enviar.");
      return;
    }
    const escolha = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (escolha.canceled || !local) return;
    const arquivo = escolha.assets[0];
    try {
      await enviarFoto.mutateAsync({
        personagem: local.n,
        pose,
        uri: arquivo.uri,
        tipo: arquivo.mimeType ?? "image/webp",
      });
    } catch (e) {
      Alert.alert("Não deu pra enviar a foto", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,24,41,0.4)" }} onPress={onClose} />
      <View
        className="bg-solid"
        style={{ borderTopLeftRadius: 34, borderTopRightRadius: 34, maxHeight: "88%" }}
      >
        <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: "#D9D5CD", alignSelf: "center", marginTop: 10 }} />
        <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
          <Text className="font-display text-xl uppercase text-ink">
            {criando ? "Novo personagem" : `Editar · nº ${local.n}`}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-subtle">
            <X color={colors.muted} size={18} />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="gap-4 px-5 pb-8" keyboardShouldPersistTaps="handled">
          {criando && (
            <Campo label="Número (identifica o personagem, não dá pra trocar depois)">
              <TextInput
                keyboardType="number-pad"
                value={String(local.n)}
                onChangeText={(t) => campo("n", Number(t.replace(/[^0-9]/g, "")) || 0)}
                style={inputStyle}
              />
            </Campo>
          )}

          <Campo label="Nome">
            <TextInput value={local.nome} onChangeText={(t) => campo("nome", t)} style={inputStyle} />
          </Campo>
          <Campo label="Pronomes (ex.: ele/dele)">
            <TextInput value={local.pronomes} onChangeText={(t) => campo("pronomes", t)} style={inputStyle} />
          </Campo>
          <Campo label="Classe (ex.: Conselheiro)">
            <TextInput value={local.classe} onChangeText={(t) => campo("classe", t)} style={inputStyle} />
          </Campo>
          <Campo label="Bio">
            <TextInput
              value={local.bio}
              onChangeText={(t) => campo("bio", t)}
              multiline
              numberOfLines={3}
              style={[inputStyle, { minHeight: 76, textAlignVertical: "top" }]}
            />
          </Campo>

          <Campo label="Atributos (0 a 5)">
            <View className="gap-2.5">
              {STATS.map((s, i) => (
                <View key={s.key} className="flex-row items-center justify-between">
                  <Text className="font-body text-[13px] text-ink">{s.label}</Text>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => {
                        const stats = [...local.stats] as IrisePersonagemForm["stats"];
                        stats[i] = Math.max(0, stats[i] - 1);
                        campo("stats", stats);
                      }}
                      hitSlop={8}
                      className="h-7 w-7 items-center justify-center rounded-full bg-subtle"
                    >
                      <Text className="font-body-bold text-ink">–</Text>
                    </Pressable>
                    <Text className="w-4 text-center font-body-bold text-ink">{local.stats[i]}</Text>
                    <Pressable
                      onPress={() => {
                        const stats = [...local.stats] as IrisePersonagemForm["stats"];
                        stats[i] = Math.min(5, stats[i] + 1);
                        campo("stats", stats);
                      }}
                      hitSlop={8}
                      className="h-7 w-7 items-center justify-center rounded-full bg-subtle"
                    >
                      <Text className="font-body-bold text-ink">+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </Campo>

          <View className="flex-row items-center justify-between">
            <Text className="font-body-bold text-[13px] text-ink">Ativo (aparece no app)</Text>
            <Switch value={local.ativo} onValueChange={(v) => campo("ativo", v)} />
          </View>

          {!criando && (
            <Campo label="Fotos (precisam de 300×460, fundo transparente)">
              <View className="flex-row flex-wrap gap-3">
                {[1, 2, 3, 4, 5, 6].map((pose) => (
                  <Pressable key={pose} onPress={() => trocarFoto(pose)} className="items-center gap-1">
                    <View style={{ opacity: enviarFoto.isPending ? 0.5 : 1 }}>
                      <Busto personagem={local.n} pose={pose} size={56} />
                    </View>
                    <Text className="font-body text-[11px] text-turquoiseInk">Pose {pose}</Text>
                  </Pressable>
                ))}
              </View>
              {enviarFoto.isPending && (
                <View className="flex-row items-center gap-2 pt-1">
                  <ActivityIndicator size="small" />
                  <Text className="font-body text-xs text-dim">Enviando…</Text>
                </View>
              )}
            </Campo>
          )}
          {criando && (
            <Text className="font-body text-xs text-dim">
              Salve primeiro — as fotos entram depois de o personagem existir.
            </Text>
          )}

          <Pressable
            disabled={salvar.isPending}
            onPress={onSalvar}
            className="mt-2 h-[52px] items-center justify-center rounded-full bg-turquoise active:opacity-80"
            style={shadow.turquoise}
          >
            {salvar.isPending ? (
              <ActivityIndicator color={colors.night} />
            ) : (
              <Text className="font-body-bold text-sm text-night">Salvar</Text>
            )}
          </Pressable>

          {!criando && (
            <Pressable
              disabled={excluir.isPending}
              onPress={onExcluir}
              className="h-[48px] items-center justify-center active:opacity-70"
            >
              <Text className="font-body-medium text-sm text-coralInk">Excluir personagem</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
