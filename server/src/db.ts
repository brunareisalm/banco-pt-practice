/**
 * Base de dados SQLite, persistente entre reinícios do servidor — em
 * desenvolvimento local, um ficheiro (server/data/banco.db); em produção, a
 * mesma coisa mas alojada no Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN em
 * .env), sem mudar nenhuma linha de código. Para voltar a uma base de dados
 * limpa (ex.: antes de correr os testes do zero), usa `npm run db:reset` —
 * apaga o ficheiro local e o seed volta a correr no arranque seguinte (em
 * produção, apaga as tabelas a partir do dashboard/CLI do Turso).
 *
 * Guardamos tudo em memória (Maps/arrays, tal como antes) e sincronizamos com
 * a base de dados: `carregarDados()` lê os dados para a memória no arranque,
 * e `guardarDados()` volta a escrever tudo — chamada automaticamente a
 * seguir a qualquer pedido HTTP que não seja GET (ver index.ts). Isto evita
 * ter de reescrever cada função para falar diretamente com a base de dados.
 */

import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

export interface User {
  id: string;
  username: string;
  password: string;
  nomeCompleto: string;
  telefone: string;
  telefoneMBWay?: string;
  pin: string;
}

export interface Conta {
  id: string;
  userId: string;
  iban: string;
  tipo: "DO" | "DP" | "POUPANCA";
  moeda: "EUR";
  saldo: number;
}

export interface Movimento {
  id: string;
  contaId: string;
  data: string; // ISO date
  descricao: string;
  valor: number; // positivo = crédito, negativo = débito
  saldoApos: number;
}

export interface Cartao {
  id: string;
  userId: string;
  contaId?: string; // conta associada (débito, ou conta de pagamento do crédito)
  numeroMascarado: string;
  titular: string;
  tipo: "DEBITO" | "CREDITO";
  validade: string; // MM/AA
  estado: "ATIVO" | "BLOQUEADO" | "PENDENTE_ATIVACAO" | "CANCELADO";
  limite?: number; // limite total, apenas em cartões de crédito
  saldoDevedor?: number; // valor em dívida, apenas em cartões de crédito
}

export interface MovimentoCartao {
  id: string;
  cartaoId: string;
  data: string; // ISO date
  descricao: string;
  valor: number; // positivo = despesa, negativo = pagamento
}

export interface OperacaoAgendada {
  id: string;
  userId: string;
  descricao: string;
  valor: number;
  dataAgendada: string; // ISO date
  estado: "AGENDADA" | "CONCLUIDA" | "CANCELADA";
}

export const users = new Map<string, User>();
export const contas = new Map<string, Conta>();
export const movimentos: Movimento[] = [];
export const cartoes = new Map<string, Cartao>();
export const movimentosCartao: MovimentoCartao[] = [];
export const operacoesAgendadas = new Map<string, OperacaoAgendada>();
export const tokens = new Map<string, string>(); // token -> userId (nunca persistido: reiniciar o servidor obriga a novo login, como é normal)

let userCounter = 1;
let contaCounter = 1;
let movCounter = 1;
let cartaoCounter = 1;
let movCartaoCounter = 1;
let agendamentoCounter = 1;

// -----------------------------------------------------------------------
// Ligação à base de dados
// -----------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "banco.db");
fs.mkdirSync(DATA_DIR, { recursive: true });

// Sem TURSO_DATABASE_URL definido (dev local), usa um ficheiro SQLite local —
// com TURSO_DATABASE_URL definido (produção), liga-se à base de dados na
// Turso. O resto do código nem sabe a diferença.
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${DB_PATH}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function criarTabelas() {
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    nomeCompleto TEXT NOT NULL,
    telefone TEXT NOT NULL,
    telefoneMBWay TEXT,
    pin TEXT NOT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS contas (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    iban TEXT NOT NULL,
    tipo TEXT NOT NULL,
    moeda TEXT NOT NULL,
    saldo REAL NOT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS movimentos (
    id TEXT PRIMARY KEY,
    contaId TEXT NOT NULL,
    data TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    saldoApos REAL NOT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS cartoes (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    contaId TEXT,
    numeroMascarado TEXT NOT NULL,
    titular TEXT NOT NULL,
    tipo TEXT NOT NULL,
    validade TEXT NOT NULL,
    estado TEXT NOT NULL,
    limite REAL,
    saldoDevedor REAL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS movimentos_cartao (
    id TEXT PRIMARY KEY,
    cartaoId TEXT NOT NULL,
    data TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS operacoes_agendadas (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    dataAgendada TEXT NOT NULL,
    estado TEXT NOT NULL
  )`);
}

const tabelasProntas = criarTabelas();

function maiorSufixoNumerico(ids: string[]): number {
  return ids.reduce((maior, id) => {
    const numero = Number(id.slice(id.lastIndexOf("_") + 1));
    return Number.isFinite(numero) && numero > maior ? numero : maior;
  }, 0);
}

/** Lê a base de dados para a memória. Chamar uma vez no arranque do servidor. */
export async function carregarDados() {
  await tabelasProntas;

  users.clear();
  contas.clear();
  movimentos.length = 0;
  cartoes.clear();
  movimentosCartao.length = 0;
  operacoesAgendadas.clear();

  const [
    linhasUsers,
    linhasContas,
    linhasMovimentos,
    linhasCartoes,
    linhasMovimentosCartao,
    linhasAgendamentos,
  ] = await Promise.all([
    db.execute("SELECT * FROM users"),
    db.execute("SELECT * FROM contas"),
    db.execute("SELECT * FROM movimentos ORDER BY rowid ASC"),
    db.execute("SELECT * FROM cartoes"),
    db.execute("SELECT * FROM movimentos_cartao ORDER BY rowid ASC"),
    db.execute("SELECT * FROM operacoes_agendadas"),
  ]);

  for (const linha of linhasUsers.rows as unknown as User[]) {
    users.set(linha.id, { ...linha, telefoneMBWay: linha.telefoneMBWay ?? undefined });
  }
  for (const linha of linhasContas.rows as unknown as Conta[]) {
    contas.set(linha.id, linha);
  }
  for (const linha of linhasMovimentos.rows as unknown as Movimento[]) {
    movimentos.push(linha);
  }
  for (const linha of linhasCartoes.rows as unknown as Cartao[]) {
    cartoes.set(linha.id, {
      ...linha,
      contaId: linha.contaId ?? undefined,
      limite: linha.limite ?? undefined,
      saldoDevedor: linha.saldoDevedor ?? undefined,
    });
  }
  for (const linha of linhasMovimentosCartao.rows as unknown as MovimentoCartao[]) {
    movimentosCartao.push(linha);
  }
  for (const linha of linhasAgendamentos.rows as unknown as OperacaoAgendada[]) {
    operacoesAgendadas.set(linha.id, linha);
  }

  userCounter = maiorSufixoNumerico([...users.keys()]) + 1;
  contaCounter = maiorSufixoNumerico([...contas.keys()]) + 1;
  movCounter = maiorSufixoNumerico(movimentos.map((m) => m.id)) + 1;
  cartaoCounter = maiorSufixoNumerico([...cartoes.keys()]) + 1;
  movCartaoCounter = maiorSufixoNumerico(movimentosCartao.map((m) => m.id)) + 1;
  agendamentoCounter = maiorSufixoNumerico([...operacoesAgendadas.keys()]) + 1;

  return { temDados: users.size > 0 };
}

/** Escreve o estado atual da memória na base de dados. */
export async function guardarDados() {
  await tabelasProntas;

  await db.batch(
    [
      "DELETE FROM users",
      "DELETE FROM contas",
      "DELETE FROM movimentos",
      "DELETE FROM cartoes",
      "DELETE FROM movimentos_cartao",
      "DELETE FROM operacoes_agendadas",
      ...[...users.values()].map((u) => ({
        sql: "INSERT INTO users (id, username, password, nomeCompleto, telefone, telefoneMBWay, pin) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [u.id, u.username, u.password, u.nomeCompleto, u.telefone, u.telefoneMBWay ?? null, u.pin],
      })),
      ...[...contas.values()].map((c) => ({
        sql: "INSERT INTO contas (id, userId, iban, tipo, moeda, saldo) VALUES (?, ?, ?, ?, ?, ?)",
        args: [c.id, c.userId, c.iban, c.tipo, c.moeda, c.saldo],
      })),
      ...movimentos.map((m) => ({
        sql: "INSERT INTO movimentos (id, contaId, data, descricao, valor, saldoApos) VALUES (?, ?, ?, ?, ?, ?)",
        args: [m.id, m.contaId, m.data, m.descricao, m.valor, m.saldoApos],
      })),
      ...[...cartoes.values()].map((c) => ({
        sql: "INSERT INTO cartoes (id, userId, contaId, numeroMascarado, titular, tipo, validade, estado, limite, saldoDevedor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          c.id,
          c.userId,
          c.contaId ?? null,
          c.numeroMascarado,
          c.titular,
          c.tipo,
          c.validade,
          c.estado,
          c.limite ?? null,
          c.saldoDevedor ?? null,
        ],
      })),
      ...movimentosCartao.map((m) => ({
        sql: "INSERT INTO movimentos_cartao (id, cartaoId, data, descricao, valor) VALUES (?, ?, ?, ?, ?)",
        args: [m.id, m.cartaoId, m.data, m.descricao, m.valor],
      })),
      ...[...operacoesAgendadas.values()].map((o) => ({
        sql: "INSERT INTO operacoes_agendadas (id, userId, descricao, valor, dataAgendada, estado) VALUES (?, ?, ?, ?, ?, ?)",
        args: [o.id, o.userId, o.descricao, o.valor, o.dataAgendada, o.estado],
      })),
    ],
    "write"
  );
}

// -----------------------------------------------------------------------
// Funções de domínio — inalteradas: continuam a mexer só nas estruturas em
// memória, a persistência é tratada à parte por guardarDados().
// -----------------------------------------------------------------------

export function gerarIban(): string {
  const numero = String(100000000000 + contaCounter).padStart(21, "0");
  return `PT50${numero}`;
}

export function criarUtilizador(data: {
  username: string;
  password: string;
  nomeCompleto: string;
  telefone: string;
}): { user: User; conta: Conta } {
  const id = `user_${userCounter++}`;
  const user: User = { id, ...data, pin: "0000" }; // PIN por defeito, a alterar em Definições
  users.set(id, user);

  const contaId = `conta_${contaCounter++}`;
  const conta: Conta = {
    id: contaId,
    userId: id,
    iban: gerarIban(),
    tipo: "DO",
    moeda: "EUR",
    saldo: 500, // saldo inicial de boas-vindas
  };
  contas.set(contaId, conta);

  registarMovimento(contaId, "Depósito inicial de boas-vindas", 500);

  return { user, conta };
}

export function criarConta(userId: string, tipo: "DO" | "DP" | "POUPANCA", saldoInicial: number): Conta {
  const contaId = `conta_${contaCounter++}`;
  const conta: Conta = {
    id: contaId,
    userId,
    iban: gerarIban(),
    tipo,
    moeda: "EUR",
    saldo: saldoInicial,
  };
  contas.set(contaId, conta);
  return conta;
}

export function criarCartao(data: {
  userId: string;
  contaId?: string;
  titular: string;
  tipo: "DEBITO" | "CREDITO";
  validade: string;
  limite?: number;
  saldoDevedor?: number;
  estado?: Cartao["estado"];
}): Cartao {
  const id = `cartao_${cartaoCounter}`;
  const ultimosDigitos = String(1000 + cartaoCounter).slice(-4);
  cartaoCounter++;

  const cartao: Cartao = {
    id,
    userId: data.userId,
    contaId: data.contaId,
    numeroMascarado: `•••• •••• •••• ${ultimosDigitos}`,
    titular: data.titular,
    tipo: data.tipo,
    validade: data.validade,
    estado: data.estado ?? "ATIVO",
    limite: data.limite,
    saldoDevedor: data.saldoDevedor,
  };
  cartoes.set(id, cartao);
  return cartao;
}

export function registarMovimentoCartao(cartaoId: string, descricao: string, valor: number): MovimentoCartao {
  const cartao = cartoes.get(cartaoId);
  if (!cartao) throw new Error("cartao_not_found");

  cartao.saldoDevedor = Math.round(((cartao.saldoDevedor ?? 0) + valor) * 100) / 100;

  const mov: MovimentoCartao = {
    id: `movcartao_${movCartaoCounter++}`,
    cartaoId,
    data: new Date().toISOString(),
    descricao,
    valor,
  };
  movimentosCartao.unshift(mov);
  return mov;
}

export function criarOperacaoAgendada(data: {
  userId: string;
  descricao: string;
  valor: number;
  dataAgendada: string;
  estado?: OperacaoAgendada["estado"];
}): OperacaoAgendada {
  const id = `agendamento_${agendamentoCounter++}`;
  const operacao: OperacaoAgendada = {
    id,
    userId: data.userId,
    descricao: data.descricao,
    valor: data.valor,
    dataAgendada: data.dataAgendada,
    estado: data.estado ?? "AGENDADA",
  };
  operacoesAgendadas.set(id, operacao);
  return operacao;
}

export function registarMovimento(contaId: string, descricao: string, valor: number): Movimento {
  const conta = contas.get(contaId);
  if (!conta) throw new Error("conta_not_found");

  conta.saldo = Math.round((conta.saldo + valor) * 100) / 100;

  const mov: Movimento = {
    id: `mov_${movCounter++}`,
    contaId,
    data: new Date().toISOString(),
    descricao,
    valor,
    saldoApos: conta.saldo,
  };
  movimentos.unshift(mov);
  return mov;
}

export function encontrarContaPorIban(iban: string): Conta | undefined {
  return [...contas.values()].find((c) => c.iban === iban);
}

export function seed() {
  // utilizador de demonstração, para conseguires entrar já sem teres de registar nada
  const { user, conta } = criarUtilizador({
    username: "demo",
    password: "demo123",
    nomeCompleto: "Utilizador Demo",
    telefone: "910000000",
  });
  user.pin = "1234"; // PIN de demonstração, documentado no README
  registarMovimento(conta.id, "Salário", 1200);
  registarMovimento(conta.id, "Renda", -650);
  registarMovimento(conta.id, "Compra supermercado", -84.32);
  registarMovimento(conta.id, "Depósito extra", 3000);

  // Duas contas à Ordem adicionais, para testares seleção de conta em
  // transferências/pagamentos/MB WAY e transferências entre contas próprias.
  const contaViagens = criarConta(user.id, "DO", 0);
  registarMovimento(contaViagens.id, "Depósito inicial", 300);
  registarMovimento(contaViagens.id, "Transferência recebida", 150);
  registarMovimento(contaViagens.id, "Depósito extra", 1000);

  const contaPoupanca = criarConta(user.id, "POUPANCA", 0);
  registarMovimento(contaPoupanca.id, "Depósito inicial", 50);
  registarMovimento(contaPoupanca.id, "Depósito extra", 2000);

  // Um cartão de débito (associado à conta principal) e um de crédito, para
  // praticares o ecrã de Cartões.
  criarCartao({
    userId: user.id,
    contaId: conta.id,
    titular: user.nomeCompleto,
    tipo: "DEBITO",
    validade: "12/29",
  });
  const cartaoCredito = criarCartao({
    userId: user.id,
    contaId: conta.id,
    titular: user.nomeCompleto,
    tipo: "CREDITO",
    validade: "06/28",
    limite: 1000,
  });
  registarMovimentoCartao(cartaoCredito.id, "Compra Continente", 45.2);
  registarMovimentoCartao(cartaoCredito.id, "Compra Amazon", 89.9);
  registarMovimentoCartao(cartaoCredito.id, "Farmácia", 12.4);

  // Um segundo cartão de crédito pendente de ativação, para praticares o
  // ecrã de Ativação de Cartão de Crédito.
  criarCartao({
    userId: user.id,
    contaId: conta.id,
    titular: user.nomeCompleto,
    tipo: "CREDITO",
    validade: "03/30",
    limite: 500,
    saldoDevedor: 0,
    estado: "PENDENTE_ATIVACAO",
  });

  // Operações agendadas de exemplo, para praticares o ecrã de Consultas > Operações agendadas.
  criarOperacaoAgendada({
    userId: user.id,
    descricao: "Renda - transferência mensal",
    valor: 650,
    dataAgendada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  criarOperacaoAgendada({
    userId: user.id,
    descricao: "Pagamento de serviço - Ent. 12345 Ref. 111222333",
    valor: 32.5,
    dataAgendada: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Segundo utilizador de exemplo, com mais contas/cartões e saldos altos,
  // para teres um cenário alternativo à conta demo (que fica protegida).
  const { user: userBreisalm, conta: contaBreisalm1 } = criarUtilizador({
    username: "breisalm",
    password: "br163264",
    nomeCompleto: "Breisalm",
    telefone: "920000000",
  });
  registarMovimento(contaBreisalm1.id, "Depósito extra", 14500); // fica com 15 000 € (soma com os 500 € de boas-vindas)

  const contaBreisalm2 = criarConta(userBreisalm.id, "DO", 0);
  registarMovimento(contaBreisalm2.id, "Depósito inicial", 8000);

  const contaBreisalm3 = criarConta(userBreisalm.id, "DO", 0);
  registarMovimento(contaBreisalm3.id, "Depósito inicial", 5000);

  const poupancaBreisalm1 = criarConta(userBreisalm.id, "POUPANCA", 0);
  registarMovimento(poupancaBreisalm1.id, "Depósito inicial", 20000);

  const poupancaBreisalm2 = criarConta(userBreisalm.id, "POUPANCA", 0);
  registarMovimento(poupancaBreisalm2.id, "Depósito inicial", 10000);

  const poupancaBreisalm3 = criarConta(userBreisalm.id, "POUPANCA", 0);
  registarMovimento(poupancaBreisalm3.id, "Depósito inicial", 5000);

  // 3 cartões de débito, um por conta à ordem.
  criarCartao({
    userId: userBreisalm.id,
    contaId: contaBreisalm1.id,
    titular: userBreisalm.nomeCompleto,
    tipo: "DEBITO",
    validade: "12/30",
  });
  criarCartao({
    userId: userBreisalm.id,
    contaId: contaBreisalm2.id,
    titular: userBreisalm.nomeCompleto,
    tipo: "DEBITO",
    validade: "12/30",
  });
  criarCartao({
    userId: userBreisalm.id,
    contaId: contaBreisalm3.id,
    titular: userBreisalm.nomeCompleto,
    tipo: "DEBITO",
    validade: "12/30",
  });

  // 3 cartões de crédito, um por conta à ordem, com limites diferentes.
  const creditoBreisalm1 = criarCartao({
    userId: userBreisalm.id,
    contaId: contaBreisalm1.id,
    titular: userBreisalm.nomeCompleto,
    tipo: "CREDITO",
    validade: "06/29",
    limite: 5000,
  });
  registarMovimentoCartao(creditoBreisalm1.id, "Compra Continente", 120.5);
  registarMovimentoCartao(creditoBreisalm1.id, "Farmácia", 18.3);

  criarCartao({
    userId: userBreisalm.id,
    contaId: contaBreisalm2.id,
    titular: userBreisalm.nomeCompleto,
    tipo: "CREDITO",
    validade: "09/29",
    limite: 3000,
  });

  criarCartao({
    userId: userBreisalm.id,
    contaId: contaBreisalm3.id,
    titular: userBreisalm.nomeCompleto,
    tipo: "CREDITO",
    validade: "03/30",
    limite: 2000,
  });
}
