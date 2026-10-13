#!/usr/bin/env node
// Gera o JWT (client secret) que a Supabase pede no provider Apple pra login pelo navegador
// (admin.js). A chave .p8 nunca sai da máquina — isso roda local, sem internet.
//
// Uso:
//   node scripts/apple-client-secret.mjs <caminho-do-.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>
//
// Exemplo:
//   node scripts/apple-client-secret.mjs ~/Downloads/AuthKey_ABCD123456.p8 USNLFZZ9AQ ABCD123456 br.com.irisa.web
//
// TEAM_ID: developer.apple.com/account → Membership (ou o prefixo antes do bundle id, ex.
//   USNLFZZ9AQ.br.com.irisa.ios → o TEAM_ID é USNLFZZ9AQ).
// KEY_ID: aparece na tela da chave em Certificates → Keys, e costuma estar no nome do arquivo
//   (AuthKey_<KEY_ID>.p8).
// SERVICES_ID: o Services ID criado pro login do painel (br.com.irisa.web).
//
// O JWT vale 6 meses (o máximo que a Apple aceita); rodar de novo quando vencer.

import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { Buffer } from "node:buffer";

const [, , keyPath, teamId, keyId, servicesId] = process.argv;
if (!keyPath || !teamId || !keyId || !servicesId) {
  console.error("Uso: node scripts/apple-client-secret.mjs <caminho-do-.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>");
  process.exit(1);
}

const privateKey = readFileSync(keyPath.replace(/^~/, process.env.HOME ?? "~"), "utf8");

const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  // 6 meses é o máximo que a Apple aceita pra esse JWT.
  exp: now + 15777000,
  aud: "https://appleid.apple.com",
  sub: servicesId,
};

const headerB64 = b64url(Buffer.from(JSON.stringify(header)));
const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
const signingInput = `${headerB64}.${payloadB64}`;

const signer = createSign("sha256");
signer.update(signingInput);
signer.end();
// dsaEncoding "ieee-p1363": formato que o JWT ES256 exige (não o DER padrão do OpenSSL).
const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

const jwt = `${signingInput}.${b64url(signature)}`;

console.log("\nCola isso no campo \"Secret Key\" do provider Apple na Supabase:\n");
console.log(jwt);
console.log("\nVence em 6 meses a partir de hoje — guarde a data pra lembrar de gerar de novo.\n");
