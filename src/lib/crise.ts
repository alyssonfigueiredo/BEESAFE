// Assunto de suicídio ou de se machucar no chat do irise: nunca vai para o modelo. A resposta é
// fixa, aponta direto o CVV (Centro de Valorização da Vida, 188, grátis, 24 h) e o chat mostra o
// botão de ligar. A mesma lista está em supabase/functions/irise-orchestrator/index.ts (CRISE) —
// mudou aqui, mudar lá.

const CRISE =
  /suicid|me matar|matar a mim|me mato|quero morrer|queria morrer|vontade de morrer|prefiro morrer|melhor (eu )?morrer|morrer logo|nao quero (mais )?viver|nao aguento mais viver|cansad[oae] de viver|sem vontade de viver|tirar (a )?minha (propria )?vida|acabar com (a )?minha vida|acabar com tudo|dar fim (a|na) minha vida|por fim (a|na) minha vida|me cortar|me corto|me machucar|me machuco|automutil|auto ?lesao|me enforcar|tomar (todos os|uns|varios) remedios|overdose|pular (da|de uma|do) (ponte|predio|janela|sacada)|me jogar (da|de uma|do|na frente)|seria melhor sem mim|melhor sem mim|ninguem sentiria (a )?minha falta|nao vale a pena viver|sumir pra sempre|desaparecer pra sempre/;

export function ehCrise(texto: string) {
  const t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return CRISE.test(t);
}

export const MENSAGEM_CRISE =
  "Que bom que você falou. Você não precisa passar por isso sozinhe. Liga agora pro CVV, o Centro de Valorização da Vida: 188, de graça, 24 horas, com gente pronta pra te ouvir. Se estiver em perigo agora, liga 192. Eu sigo aqui com você.";

export const CVV_TEL = "tel:188";
export const CVV_CHAT = "https://cvv.org.br/chat/";
