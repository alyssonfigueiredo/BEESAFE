// Roda import-places-overture.mjs para todos os municípios da região metropolitana de uma capital,
// um de cada vez (a capital em si já foi importada antes, então não entra na lista).
// Lista de municípios tirada da API de regiões metropolitanas do IBGE em 01/10/2026 e, desde
// 05/10/2026, também de leis estaduais/Wikipédia para as RMs de belo-horizonte, fortaleza,
// brasilia (RIDE-DF), goiania, vitoria, manaus, belem, florianopolis, sao-luis, aracaju, maceio,
// cuiaba e teresina (RIDE PI+MA) — cada código IBGE confirmado na API oficial, município por nome.
//
// Roda na SUA máquina:
//   set -a && source .env.scripts && set +a
//   node scripts/import-regiao-metropolitana.mjs curitiba
//   node scripts/import-regiao-metropolitana.mjs curitiba --simular   # só conta, não grava
//   node scripts/import-regiao-metropolitana.mjs curitiba --limite 200
//
// Não baixa foto nenhuma e não chama a API do Google: zero custo. Continua para o próximo
// município mesmo se um der erro (malha do IBGE fora do ar, por exemplo) e mostra o resumo no fim.

import { spawnSync } from "node:child_process";

const REGIOES = {
  curitiba: [
    [4100202, "Adrianópolis"], [4100301, "Agudos do Sul"], [4100400, "Almirante Tamandaré"],
    [4101804, "Araucária"], [4102307, "Balsa Nova"], [4103107, "Bocaiúva do Sul"],
    [4104006, "Campina Grande do Sul"], [4104204, "Campo Largo"], [4104253, "Campo Magro"],
    [4104105, "Campo do Tenente"], [4105201, "Cerro Azul"], [4105805, "Colombo"],
    [4106209, "Contenda"], [4128633, "Doutor Ulysses"], [4107652, "Fazenda Rio Grande"],
    [4111258, "Itaperuçu"], [4113205, "Lapa"], [4114302, "Mandirituba"], [4119152, "Pinhais"],
    [4119509, "Piraquara"], [4119103, "Piên"], [4120804, "Quatro Barras"],
    [4121208, "Quitandinha"], [4122206, "Rio Branco do Sul"], [4122305, "Rio Negro"],
    [4125506, "São José dos Pinhais"], [4127601, "Tijucas do Sul"], [4127882, "Tunas do Paraná"],
  ],
  recife: [
    [2600054, "Abreu e Lima"], [2601052, "Araçoiaba"], [2602902, "Cabo de Santo Agostinho"],
    [2603454, "Camaragibe"], [2606804, "Igarassu"], [2607604, "Ilha de Itamaracá"],
    [2607208, "Ipojuca"], [2607752, "Itapissuma"], [2607901, "Jaboatão dos Guararapes"],
    [2609402, "Moreno"], [2609600, "Olinda"], [2610707, "Paulista"],
    [2613701, "São Lourenço da Mata"],
  ],
  "joao-pessoa": [
    [2500601, "Alhandra"], [2501807, "Bayeux"], [2503001, "Caaporã"], [2503209, "Cabedelo"],
    [2504603, "Conde"], [2504900, "Cruz do Espírito Santo"], [2508604, "Lucena"],
    [2511202, "Pedras de Fogo"], [2511905, "Pitimbu"], [2512903, "Rio Tinto"],
    [2513703, "Santa Rita"],
  ],
  joinville: [
    [4201307, "Araquari"], [4202057, "Balneário Barra do Sul"], [4203303, "Campo Alegre"],
    [4205803, "Garuva"], [4208450, "Itapoá"], [4215000, "Rio Negrinho"],
    [4215802, "São Bento do Sul"], [4216206, "São Francisco do Sul"],
  ],
  natal: [
    [2401206, "Arez"], [2401701, "Bom Jesus"], [2402600, "Ceará-Mirim"], [2403608, "Extremoz"],
    [2404200, "Goianinha"], [2404606, "Ielmo Marinho"], [2407104, "Macaíba"],
    [2407500, "Maxaranguape"], [2407807, "Monte Alegre"], [2408201, "Nísia Floresta"],
    [2403251, "Parnamirim"], [2412005, "São Gonçalo do Amarante"],
    [2412203, "São José de Mipibu"], [2414803, "Vera Cruz"],
  ],
  "sao-paulo": [
    [3503901, "Arujá"], [3505708, "Barueri"], [3506607, "Biritiba Mirim"], [3509007, "Caieiras"],
    [3509205, "Cajamar"], [3510609, "Carapicuíba"], [3513009, "Cotia"], [3513801, "Diadema"],
    [3515004, "Embu das Artes"], [3515103, "Embu-Guaçu"], [3515707, "Ferraz de Vasconcelos"],
    [3516309, "Francisco Morato"], [3516408, "Franco da Rocha"], [3518305, "Guararema"],
    [3518800, "Guarulhos"], [3522208, "Itapecerica da Serra"], [3522505, "Itapevi"],
    [3523107, "Itaquaquecetuba"], [3525003, "Jandira"], [3526209, "Juquitiba"],
    [3528502, "Mairiporã"], [3529401, "Mauá"], [3530607, "Mogi das Cruzes"],
    [3534401, "Osasco"], [3539103, "Pirapora do Bom Jesus"], [3539806, "Poá"],
    [3543303, "Ribeirão Pires"], [3544103, "Rio Grande da Serra"], [3545001, "Salesópolis"],
    [3546801, "Santa Isabel"], [3547304, "Santana de Parnaíba"], [3547809, "Santo André"],
    [3552502, "Suzano"], [3548708, "São Bernardo do Campo"], [3548807, "São Caetano do Sul"],
    [3549953, "São Lourenço da Serra"], [3552809, "Taboão da Serra"],
    [3556453, "Vargem Grande Paulista"],
  ],
  rio: [
    [3300456, "Belford Roxo"], [3300803, "Cachoeiras de Macacu"], [3301702, "Duque de Caxias"],
    [3301850, "Guapimirim"], [3301900, "Itaboraí"], [3302007, "Itaguaí"], [3302270, "Japeri"],
    [3302502, "Magé"], [3302700, "Maricá"], [3302858, "Mesquita"], [3303203, "Nilópolis"],
    [3303302, "Niterói"], [3303500, "Nova Iguaçu"], [3303609, "Paracambi"],
    [3303906, "Petrópolis"], [3304144, "Queimados"], [3304300, "Rio Bonito"],
    [3305554, "Seropédica"], [3304904, "São Gonçalo"], [3305109, "São João de Meriti"],
    [3305752, "Tanguá"],
  ],
  salvador: [
    [2905701, "Camaçari"], [2906501, "Candeias"], [2910057, "Dias d'Ávila"],
    [2916104, "Itaparica"], [2919207, "Lauro de Freitas"], [2919926, "Madre de Deus"],
    [2921005, "Mata de São João"], [2925204, "Pojuca"], [2930709, "Simões Filho"],
    [2929206, "São Francisco do Conde"], [2929503, "São Sebastião do Passé"],
    [2933208, "Vera Cruz"],
  ],
  "porto-alegre": [
    [4300604, "Alvorada"], [4300877, "Araricá"], [4301107, "Arroio dos Ratos"],
    [4303103, "Cachoeirinha"], [4303905, "Campo Bom"], [4304606, "Canoas"],
    [4304689, "Capela de Santana"], [4305355, "Charqueadas"], [4306403, "Dois Irmãos"],
    [4306767, "Eldorado do Sul"], [4307708, "Esteio"], [4307609, "Estância Velha"],
    [4309050, "Glorinha"], [4309209, "Gravataí"], [4309308, "Guaíba"],
    [4310108, "Igrejinha"], [4310801, "Ivoti"], [4312401, "Montenegro"],
    [4313060, "Nova Hartz"], [4313375, "Nova Santa Rita"], [4313409, "Novo Hamburgo"],
    [4314050, "Parobé"], [4314803, "Portão"], [4316006, "Rolante"],
    [4317608, "Santo Antônio da Patrulha"], [4319901, "Sapiranga"],
    [4320008, "Sapucaia do Sul"], [4318408, "São Jerônimo"], [4318705, "São Leopoldo"],
    [4319505, "São Sebastião do Caí"], [4321204, "Taquara"], [4322004, "Triunfo"],
    [4323002, "Viamão"],
  ],
  "belo-horizonte": [
    [3106705, "Betim"], [3118601, "Contagem"], [3129806, "Ibirité"], [3156700, "Sabará"],
    [3157807, "Santa Luzia"], [3144805, "Nova Lima"], [3154606, "Ribeirão das Neves"],
    [3171204, "Vespasiano"], [3162955, "São José da Lapa"], [3124104, "Esmeraldas"],
    [3140704, "Mateus Leme"], [3130101, "Igarapé"], [3136652, "Juatuba"], [3140159, "Mário Campos"],
    [3165537, "Sarzedo"], [3109006, "Brumadinho"], [3110004, "Caeté"], [3154804, "Rio Acima"],
    [3153905, "Raposos"], [3136603, "Nova União"], [3134608, "Jaboticatubas"],
    [3168309, "Taquaraçu de Minas"], [3112505, "Capim Branco"], [3141108, "Matozinhos"],
    [3149309, "Pedro Leopoldo"], [3117876, "Confins"], [3137601, "Lagoa Santa"], [3105004, "Baldim"],
    [3163102, "São José da Varginha"], [3132206, "Itaguara"], [3133709, "Itatiaiuçu"],
    [3126000, "Florestal"], [3155306, "Rio Manso"], [3162922, "São Joaquim de Bicas"],
  ],
  fortaleza: [
    [2301000, "Aquiraz"], [2303501, "Cascavel"], [2303709, "Caucaia"], [2303956, "Chorozinho"],
    [2304285, "Eusébio"], [2304954, "Guaiúba"], [2305233, "Horizonte"], [2306256, "Itaitinga"],
    [2307650, "Maracanaú"], [2307700, "Maranguape"], [2309607, "Pacajus"], [2309706, "Pacatuba"],
    [2310852, "Pindoretama"], [2312403, "São Gonçalo do Amarante"], [2312601, "São Luís do Curu"],
    [2310258, "Paraipaba"], [2310209, "Paracuru"], [2313500, "Trairi"],
  ],
  brasilia: [
    // RIDE-DF, lado Goiás
    [5200100, "Abadiânia"], [5200175, "Água Fria de Goiás"], [5200258, "Águas Lindas de Goiás"],
    [5200308, "Alexânia"], [5204003, "Cabeceiras"], [5205497, "Cidade Ocidental"],
    [5205513, "Cocalzinho de Goiás"], [5205802, "Corumbá de Goiás"], [5206206, "Cristalina"],
    [5208004, "Formosa"], [5212501, "Luziânia"], [5213053, "Mimoso de Goiás"],
    [5215231, "Novo Gama"], [5215603, "Padre Bernardo"], [5217302, "Pirenópolis"],
    [5217609, "Planaltina"], [5219753, "Santo Antônio do Descoberto"],
    [5221858, "Valparaíso de Goiás"], [5222203, "Vila Boa"],
    // RIDE-DF, lado Minas Gerais
    [3170404, "Unaí"], [3109303, "Buritis"], [3109451, "Cabeceira Grande"],
  ],
  goiania: [
    [5200050, "Abadia de Goiás"], [5201405, "Aparecida de Goiânia"], [5201801, "Aragoiânia"],
    [5203302, "Bela Vista de Goiás"], [5203559, "Bonfinópolis"], [5203609, "Brazabrantes"],
    [5204557, "Caldazinha"], [5205208, "Caturaí"], [5208400, "Goianápolis"],
    [5208806, "Goianira"], [5209200, "Guapó"], [5209705, "Hidrolândia"], [5210000, "Inhumas"],
    [5214507, "Nerópolis"], [5215009, "Nova Veneza"], [5219100, "Santa Bárbara de Goiás"],
    [5219738, "Santo Antônio de Goiás"], [5220454, "Senador Canedo"],
    [5221197, "Terezópolis de Goiás"], [5221403, "Trindade"],
  ],
  vitoria: [
    [3201308, "Cariacica"], [3205002, "Serra"], [3205101, "Viana"], [3205200, "Vila Velha"],
    [3202405, "Guarapari"], [3202207, "Fundão"],
  ],
  manaus: [
    [1300300, "Autazes"], [1301100, "Careiro"], [1301159, "Careiro da Várzea"],
    [1301852, "Iranduba"], [1301902, "Itacoatiara"], [1302009, "Itapiranga"],
    [1302504, "Manacapuru"], [1302553, "Manaquiri"], [1303205, "Novo Airão"],
    [1303536, "Presidente Figueiredo"], [1303569, "Rio Preto da Eva"], [1304005, "Silves"],
  ],
  belem: [
    [1500800, "Ananindeua"], [1501303, "Barcarena"], [1501501, "Benevides"],
    [1502400, "Castanhal"], [1504422, "Marituba"], [1506351, "Santa Bárbara do Pará"],
    [1506500, "Santa Izabel do Pará"],
  ],
  florianopolis: [
    [4200606, "Águas Mornas"], [4201208, "Antônio Carlos"], [4202305, "Biguaçu"],
    [4211900, "Palhoça"], [4215703, "Santo Amaro da Imperatriz"], [4216602, "São José"],
    [4217253, "São Pedro de Alcântara"],
  ],
  "sao-luis": [
    [2111201, "São José de Ribamar"], [2107506, "Paço do Lumiar"], [2109452, "Raposa"],
    [2100204, "Alcântara"], [2101251, "Bacabeira"], [2109601, "Rosário"],
    [2110203, "Santa Rita"], [2105104, "Icatu"], [2107100, "Morros"],
    [2109205, "Presidente Juscelino"], [2102374, "Cachoeira Grande"], [2101103, "Axixá"],
  ],
  aracaju: [
    [2800605, "Barra dos Coqueiros"], [2804805, "Nossa Senhora do Socorro"],
    [2806701, "São Cristóvão"],
  ],
  maceio: [
    [2700409, "Atalaia"], [2700508, "Barra de Santo Antônio"], [2700607, "Barra de São Miguel"],
    [2702207, "Coqueiro Seco"], [2704708, "Marechal Deodoro"], [2705200, "Messias"],
    [2705507, "Murici"], [2706448, "Paripueira"], [2706901, "Pilar"], [2707701, "Rio Largo"],
    [2707909, "Santa Luzia do Norte"], [2708907, "Satuba"],
  ],
  cuiaba: [
    [5108402, "Várzea Grande"], [5106109, "Nossa Senhora do Livramento"],
    [5107800, "Santo Antônio de Leverger"], [5100102, "Acorizal"],
    [5103007, "Chapada dos Guimarães"], [5102678, "Campo Verde"],
  ],
  teresina: [
    // RIDE interestadual (PI+MA), LC 112/2001 + Decreto 4.367/2002 — não é RM comum, mas é oficial.
    [2200400, "Altos"], [2201606, "Beneditinos"], [2202737, "Coivaras"],
    [2203255, "Curralinhos"], [2203305, "Demerval Lobão"], [2205508, "José de Freitas"],
    [2205557, "Lagoa Alegre"], [2205581, "Lagoa do Piauí"], [2206308, "Miguel Leão"],
    [2206407, "Monsenhor Gil"], [2206720, "Nazária"], [2211100, "União"],
    [2112209, "Timon"], // único município do Maranhão na RIDE
  ],
};

const args = process.argv.slice(2);
const chave = (args.find((a) => !a.startsWith("--")) ?? "").toLowerCase();
// flags passados depois do nome da região (ex.: --simular, --limite 200) vão direto pro script de import
const passthrough = args.slice(args.indexOf(chave) + 1);

const municipios = REGIOES[chave];
if (!municipios) {
  console.error(`Região não encontrada: "${chave}". Use uma destas: ${Object.keys(REGIOES).join(", ")}`);
  process.exit(1);
}

console.log(`Região metropolitana de ${chave}: ${municipios.length} municípios (a capital já foi importada antes, não entra aqui).\n`);

const resultados = [];
for (const [ibge, nome] of municipios) {
  console.log(`\n=== ${nome} (${ibge}) ===`);
  const r = spawnSync("node", ["scripts/import-places-overture.mjs", String(ibge), ...passthrough], {
    stdio: "inherit",
    env: process.env,
  });
  resultados.push({ nome, ibge, ok: r.status === 0 });
}

console.log("\n=== Resumo ===");
for (const r of resultados) {
  console.log(`${r.ok ? "OK" : "FALHOU"}  ${r.nome} (${r.ibge})`);
}
const falhas = resultados.filter((r) => !r.ok);
if (falhas.length) {
  console.log(`\n${falhas.length} município(s) falharam — rode de novo só eles depois (malha do IBGE pode estar fora do ar):`);
  console.log(falhas.map((f) => `node scripts/import-places-overture.mjs ${f.ibge}`).join("\n"));
}
