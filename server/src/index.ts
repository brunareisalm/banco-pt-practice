import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import type { Cartao } from "./db";
import {
  users,
  contas,
  movimentos,
  cartoes,
  movimentosCartao,
  operacoesAgendadas,
  tokens,
  criarUtilizador,
  registarMovimento,
  registarMovimentoCartao,
  criarCartao,
  criarConta,
  criarOperacaoAgendada,
  encontrarContaPorIban,
  seed,
  carregarDados,
  guardarDados,
} from "./db";

const app = express();
app.use(cors());
app.use(express.json());

// O Render (e a maioria dos serviços de alojamento) atribui a porta através
// desta variável de ambiente — em local, sem ela definida, usamos 4001.
const PORT = Number(process.env.PORT) || 4001;

// Qualquer pedido que não seja GET pode ter mudado o estado em memória —
// grava sempre na base de dados a seguir, para nada se perder num reinício.
app.use((req, res, next) => {
  res.on("finish", () => {
    if (req.method !== "GET") {
      guardarDados().catch((err) => console.error("Erro ao guardar dados:", err));
    }
  });
  next();
});

// A base de dados (ficheiro local em dev, Turso em produção) é persistente
// entre reinícios. Só corremos o seed uma vez, na primeira vez que arranca
// sem dados nenhuns — depois disso, cada arranque só carrega o que já lá
// está. Para voltar a começar do zero: `npm run db:reset` (dev) ou apagar as
// tabelas no dashboard/CLI do Turso (produção).
async function iniciar() {
  const { temDados } = await carregarDados();
  if (!temDados) {
    seed();
    await guardarDados();
  }

  app.listen(PORT, () => {
    console.log(`Banco PT (practice) API a correr em http://localhost:${PORT}`);
    console.log(`Login de demonstração -> username: demo / password: demo123`);
  });
}

iniciar().catch((err) => {
  console.error("Erro ao arrancar o servidor:", err);
  process.exit(1);
});

function gerarToken(): string {
  return `tok_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

// -----------------------------------------------------------------------
// Autenticação
// -----------------------------------------------------------------------

interface AuthedRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const userId = token ? tokens.get(token) : undefined;

  if (!userId) {
    return res.status(401).json({ error: "nao_autenticado" });
  }
  req.userId = userId;
  next();
}

app.post("/api/auth/registo", (req, res) => {
  const { username, password, nomeCompleto, telefone } = req.body ?? {};

  if (!username || !password || !nomeCompleto || !telefone) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "username, password, nomeCompleto e telefone são obrigatórios",
    });
  }

  const jaExiste = [...users.values()].some((u) => u.username === username);
  if (jaExiste) {
    return res.status(409).json({ error: "username_existente" });
  }

  const { user, conta } = criarUtilizador({ username, password, nomeCompleto, telefone });
  const token = gerarToken();
  tokens.set(token, user.id);

  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, nomeCompleto: user.nomeCompleto },
    conta: { id: conta.id, iban: conta.iban, saldo: conta.saldo },
  });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body ?? {};
  const user = [...users.values()].find((u) => u.username === username);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "credenciais_invalidas" });
  }

  const token = gerarToken();
  tokens.set(token, user.id);
  res.status(200).json({
    token,
    user: { id: user.id, username: user.username, nomeCompleto: user.nomeCompleto },
  });
});

app.post("/api/auth/logout", requireAuth, (req: AuthedRequest, res) => {
  const header = req.header("Authorization");
  const token = header?.slice(7);
  if (token) tokens.delete(token);
  res.status(204).send();
});

// -----------------------------------------------------------------------
// Contas
// -----------------------------------------------------------------------

app.get("/api/contas", requireAuth, (req: AuthedRequest, res) => {
  const minhasContas = [...contas.values()].filter((c) => c.userId === req.userId);
  res.json({ contas: minhasContas });
});

app.get("/api/contas/:id/movimentos", requireAuth, (req: AuthedRequest, res) => {
  const conta = contas.get(req.params.id);
  if (!conta || conta.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }
  let lista = movimentos.filter((m) => m.contaId === conta.id);

  const { desde, ate } = req.query;
  if (typeof desde === "string" && desde) {
    lista = lista.filter((m) => m.data >= desde);
  }
  if (typeof ate === "string" && ate) {
    lista = lista.filter((m) => m.data <= `${ate}T23:59:59.999Z`);
  }

  res.json({ movimentos: lista });
});

// -----------------------------------------------------------------------
// Poupanças
// -----------------------------------------------------------------------

app.post("/api/poupancas", requireAuth, (req: AuthedRequest, res) => {
  const conta = criarConta(req.userId!, "POUPANCA", 0);
  res.status(201).json({ status: "concluido", conta });
});

app.post("/api/poupancas/:id/depositar", requireAuth, (req: AuthedRequest, res) => {
  const { contaOrigemId, valor, pin } = req.body ?? {};

  if (!contaOrigemId || !valor || !pin) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaOrigemId, valor e pin são obrigatórios",
    });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const poupanca = contas.get(req.params.id);
  if (!poupanca || poupanca.userId !== req.userId || poupanca.tipo !== "POUPANCA") {
    return res.status(404).json({ error: "poupanca_invalida" });
  }

  const origem = contas.get(contaOrigemId);
  if (!origem || origem.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }

  if (valor <= 0) {
    return res.status(400).json({ error: "valor_invalido" });
  }

  if (origem.saldo < valor) {
    return res.status(400).json({ error: "saldo_insuficiente" });
  }

  registarMovimento(origem.id, `Transferência para poupança ${poupanca.iban}`, -valor);
  registarMovimento(poupanca.id, `Depósito de ${origem.iban}`, valor);

  res.status(201).json({ status: "concluido", novoSaldoPoupanca: poupanca.saldo });
});

app.post("/api/poupancas/:id/levantar", requireAuth, (req: AuthedRequest, res) => {
  const { contaDestinoId, valor, pin } = req.body ?? {};

  if (!contaDestinoId || !valor || !pin) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaDestinoId, valor e pin são obrigatórios",
    });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const poupanca = contas.get(req.params.id);
  if (!poupanca || poupanca.userId !== req.userId || poupanca.tipo !== "POUPANCA") {
    return res.status(404).json({ error: "poupanca_invalida" });
  }

  const destino = contas.get(contaDestinoId);
  if (!destino || destino.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }

  if (valor <= 0) {
    return res.status(400).json({ error: "valor_invalido" });
  }

  if (poupanca.saldo < valor) {
    return res.status(400).json({ error: "saldo_insuficiente" });
  }

  registarMovimento(poupanca.id, `Levantamento para ${destino.iban}`, -valor);
  registarMovimento(destino.id, `Levantamento da poupança ${poupanca.iban}`, valor);

  res.status(201).json({ status: "concluido", novoSaldoPoupanca: poupanca.saldo });
});

app.post("/api/poupancas/:id/excluir", requireAuth, (req: AuthedRequest, res) => {
  const { pin } = req.body ?? {};

  if (!pin) {
    return res.status(400).json({ error: "campos_obrigatorios", message: "pin é obrigatório" });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const poupanca = contas.get(req.params.id);
  if (!poupanca || poupanca.userId !== req.userId || poupanca.tipo !== "POUPANCA") {
    return res.status(404).json({ error: "poupanca_invalida" });
  }

  if (poupanca.saldo !== 0) {
    return res.status(400).json({ error: "saldo_nao_zero" });
  }

  contas.delete(poupanca.id);
  res.status(200).json({ status: "concluido" });
});

// -----------------------------------------------------------------------
// Transferências
// -----------------------------------------------------------------------

app.post("/api/transferencias", requireAuth, (req: AuthedRequest, res) => {
  const { contaOrigemId, ibanDestino, valor, descricao, pin } = req.body ?? {};

  if (!contaOrigemId || !ibanDestino || !valor || !pin) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaOrigemId, ibanDestino, valor e pin são obrigatórios",
    });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const origem = contas.get(contaOrigemId);
  if (!origem || origem.userId !== req.userId) {
    return res.status(404).json({ error: "conta_origem_nao_encontrada" });
  }

  if (valor <= 0) {
    return res.status(400).json({ error: "valor_invalido" });
  }

  if (origem.saldo < valor) {
    return res.status(400).json({ error: "saldo_insuficiente" });
  }

  if (origem.iban === ibanDestino) {
    return res.status(400).json({ error: "transferencia_para_mesma_conta" });
  }

  registarMovimento(origem.id, descricao || `Transferência para ${ibanDestino}`, -valor);

  const destino = encontrarContaPorIban(ibanDestino);
  if (destino) {
    registarMovimento(destino.id, descricao || `Transferência de ${origem.iban}`, valor);
  }

  res.status(201).json({
    status: "concluida",
    novoSaldo: origem.saldo,
    destinoConhecido: Boolean(destino),
  });
});

// -----------------------------------------------------------------------
// Pagamentos de Serviços (referência Multibanco)
// -----------------------------------------------------------------------

const ENTIDADE_REGEX = /^\d{5}$/;
const REFERENCIA_REGEX = /^\d{9}$/;

app.post("/api/pagamentos", requireAuth, (req: AuthedRequest, res) => {
  const { contaId, entidade, referencia, valor, descricao, pin } = req.body ?? {};

  if (!contaId || !entidade || !referencia || !valor || !pin) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaId, entidade, referencia, valor e pin são obrigatórios",
    });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const conta = contas.get(contaId);
  if (!conta || conta.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }

  if (!ENTIDADE_REGEX.test(entidade)) {
    return res.status(400).json({ error: "entidade_invalida" });
  }

  if (!REFERENCIA_REGEX.test(referencia)) {
    return res.status(400).json({ error: "referencia_invalida" });
  }

  if (valor <= 0) {
    return res.status(400).json({ error: "valor_invalido" });
  }

  if (conta.saldo < valor) {
    return res.status(400).json({ error: "saldo_insuficiente" });
  }

  registarMovimento(
    conta.id,
    descricao || `Pagamento de serviço - Ent. ${entidade} Ref. ${referencia}`,
    -valor
  );

  res.status(201).json({ status: "concluido", novoSaldo: conta.saldo });
});

// -----------------------------------------------------------------------
// Pagamento ao Estado e Setor Público
// -----------------------------------------------------------------------

const NISS_REGEX = /^\d{11}$/;
const PERIODO_REGEX = /^(0[1-9]|1[0-2])\/\d{4}$/;

app.post("/api/pagamentos/estado", requireAuth, (req: AuthedRequest, res) => {
  const { contaId, referencia, valor, descricao, pin } = req.body ?? {};

  if (!contaId || !referencia || !valor || !pin) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaId, referencia, valor e pin são obrigatórios",
    });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const conta = contas.get(contaId);
  if (!conta || conta.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }

  if (!REFERENCIA_REGEX.test(referencia)) {
    return res.status(400).json({ error: "referencia_invalida" });
  }

  if (valor <= 0) {
    return res.status(400).json({ error: "valor_invalido" });
  }

  if (conta.saldo < valor) {
    return res.status(400).json({ error: "saldo_insuficiente" });
  }

  registarMovimento(conta.id, descricao || `Pagamento ao Estado - Ref. ${referencia}`, -valor);

  res.status(201).json({ status: "concluido", novoSaldo: conta.saldo });
});

function criarEndpointPagamentoSocial(caminho: string, descricaoBase: string) {
  app.post(caminho, requireAuth, (req: AuthedRequest, res) => {
    const { contaId, niss, periodo, valor, descricao, pin } = req.body ?? {};

    if (!contaId || !niss || !periodo || !valor || !pin) {
      return res.status(400).json({
        error: "campos_obrigatorios",
        message: "contaId, niss, periodo, valor e pin são obrigatórios",
      });
    }

    const utilizador = users.get(req.userId!);
    if (!utilizador || pin !== utilizador.pin) {
      return res.status(400).json({ error: "pin_invalido" });
    }

    const conta = contas.get(contaId);
    if (!conta || conta.userId !== req.userId) {
      return res.status(404).json({ error: "conta_nao_encontrada" });
    }

    if (!NISS_REGEX.test(niss)) {
      return res.status(400).json({ error: "niss_invalido" });
    }

    if (!PERIODO_REGEX.test(periodo)) {
      return res.status(400).json({ error: "periodo_invalido" });
    }

    if (valor <= 0) {
      return res.status(400).json({ error: "valor_invalido" });
    }

    if (conta.saldo < valor) {
      return res.status(400).json({ error: "saldo_insuficiente" });
    }

    registarMovimento(conta.id, descricao || `${descricaoBase} - NISS ${niss} - Período ${periodo}`, -valor);

    res.status(201).json({ status: "concluido", novoSaldo: conta.saldo });
  });
}

criarEndpointPagamentoSocial("/api/pagamentos/seguranca-social", "Pagamento Segurança Social");
criarEndpointPagamentoSocial("/api/pagamentos/tsu", "Pagamento TSU");

// -----------------------------------------------------------------------
// MB WAY (ativação de carteira + pagamentos)
// -----------------------------------------------------------------------

const TELEFONE_MBWAY_REGEX = /^9\d{8}$/;

app.get("/api/mbway/estado", requireAuth, (req: AuthedRequest, res) => {
  const user = users.get(req.userId!);
  res.json({ ativo: Boolean(user?.telefoneMBWay), telefone: user?.telefoneMBWay ?? null });
});

app.post("/api/mbway/ativar", requireAuth, (req: AuthedRequest, res) => {
  const { telefone } = req.body ?? {};

  if (!telefone) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "telefone é obrigatório",
    });
  }

  if (!TELEFONE_MBWAY_REGEX.test(telefone)) {
    return res.status(400).json({ error: "telefone_invalido" });
  }

  const user = users.get(req.userId!);
  if (!user) return res.status(404).json({ error: "utilizador_nao_encontrado" });

  user.telefoneMBWay = telefone;
  res.status(200).json({ ativo: true, telefone });
});

app.post("/api/mbway/pagamentos", requireAuth, (req: AuthedRequest, res) => {
  const user = users.get(req.userId!);
  if (!user?.telefoneMBWay) {
    return res.status(400).json({ error: "carteira_nao_ativa" });
  }

  const { contaId, numeroDestino, valor, descricao, pin } = req.body ?? {};

  if (!contaId || !numeroDestino || !valor || !pin) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaId, numeroDestino, valor e pin são obrigatórios",
    });
  }

  if (pin !== user.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const conta = contas.get(contaId);
  if (!conta || conta.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }

  if (!TELEFONE_MBWAY_REGEX.test(numeroDestino)) {
    return res.status(400).json({ error: "numero_destino_invalido" });
  }

  if (valor <= 0) {
    return res.status(400).json({ error: "valor_invalido" });
  }

  if (conta.saldo < valor) {
    return res.status(400).json({ error: "saldo_insuficiente" });
  }

  registarMovimento(conta.id, descricao || `Transferência MB WAY para ${numeroDestino}`, -valor);

  res.status(201).json({ status: "concluido", novoSaldo: conta.saldo });
});

// -----------------------------------------------------------------------
// Carregamentos de telemóvel
// -----------------------------------------------------------------------

const OPERADORES_CARREGAMENTO = ["MEO", "NOS", "Vodafone", "Lycamobile", "Digi", "UZO"];
const VALORES_CARREGAMENTO = [5, 10, 15, 20, 30, 50];
const TELEFONE_CARREGAMENTO_REGEX = /^9\d{8}$/;

app.get("/api/carregamentos/opcoes", requireAuth, (_req, res) => {
  res.json({ operadores: OPERADORES_CARREGAMENTO, valores: VALORES_CARREGAMENTO });
});

app.post("/api/carregamentos", requireAuth, (req: AuthedRequest, res) => {
  const { contaId, operador, numero, valor, pin } = req.body ?? {};

  if (!contaId || !operador || !numero || !valor || !pin) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaId, operador, numero, valor e pin são obrigatórios",
    });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const conta = contas.get(contaId);
  if (!conta || conta.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }

  if (!OPERADORES_CARREGAMENTO.includes(operador)) {
    return res.status(400).json({ error: "operador_invalido" });
  }

  if (!TELEFONE_CARREGAMENTO_REGEX.test(numero)) {
    return res.status(400).json({ error: "numero_invalido" });
  }

  if (!VALORES_CARREGAMENTO.includes(valor)) {
    return res.status(400).json({ error: "valor_invalido" });
  }

  if (conta.saldo < valor) {
    return res.status(400).json({ error: "saldo_insuficiente" });
  }

  registarMovimento(conta.id, `Carregamento ${operador} - ${numero}`, -valor);

  res.status(201).json({ status: "concluido", novoSaldo: conta.saldo });
});

// -----------------------------------------------------------------------
// Cartões
// -----------------------------------------------------------------------

// O número completo e o CVV nunca vão em respostas normais — só o endpoint
// /dados-completos (com PIN) é que os devolve.
function cartaoPublico(cartao: Cartao) {
  const { numeroCompleto: _numeroCompleto, cvv: _cvv, ...resto } = cartao;
  return resto;
}

app.get("/api/cartoes", requireAuth, (req: AuthedRequest, res) => {
  const meusCartoes = [...cartoes.values()].filter((c) => c.userId === req.userId).map(cartaoPublico);
  res.json({ cartoes: meusCartoes });
});

app.post("/api/cartoes/:id/dados-completos", requireAuth, (req: AuthedRequest, res) => {
  const { pin } = req.body ?? {};

  if (!pin) {
    return res.status(400).json({ error: "campos_obrigatorios", message: "pin é obrigatório" });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const cartao = cartoes.get(req.params.id);
  if (!cartao || cartao.userId !== req.userId) {
    return res.status(404).json({ error: "cartao_nao_encontrado" });
  }

  res.json({
    titular: cartao.titular,
    numeroCompleto: cartao.numeroCompleto,
    validade: cartao.validade,
    cvv: cartao.cvv,
  });
});

app.post("/api/cartoes/:id/bloquear", requireAuth, (req: AuthedRequest, res) => {
  const cartao = cartoes.get(req.params.id);
  if (!cartao || cartao.userId !== req.userId) {
    return res.status(404).json({ error: "cartao_nao_encontrado" });
  }
  cartao.estado = "BLOQUEADO";
  res.json({ cartao: cartaoPublico(cartao) });
});

app.post("/api/cartoes/:id/desbloquear", requireAuth, (req: AuthedRequest, res) => {
  const cartao = cartoes.get(req.params.id);
  if (!cartao || cartao.userId !== req.userId) {
    return res.status(404).json({ error: "cartao_nao_encontrado" });
  }
  cartao.estado = "ATIVO";
  res.json({ cartao: cartaoPublico(cartao) });
});

app.get("/api/cartoes/:id/movimentos", requireAuth, (req: AuthedRequest, res) => {
  const cartao = cartoes.get(req.params.id);
  if (!cartao || cartao.userId !== req.userId) {
    return res.status(404).json({ error: "cartao_nao_encontrado" });
  }
  const lista = movimentosCartao.filter((m) => m.cartaoId === cartao.id);
  res.json({ movimentos: lista });
});

app.post("/api/cartoes/:id/pagar", requireAuth, (req: AuthedRequest, res) => {
  const { contaId, valor, pin } = req.body ?? {};

  if (!contaId || !valor || !pin) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaId, valor e pin são obrigatórios",
    });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const cartao = cartoes.get(req.params.id);
  if (!cartao || cartao.userId !== req.userId || cartao.tipo !== "CREDITO" || cartao.estado !== "ATIVO") {
    return res.status(404).json({ error: "cartao_invalido" });
  }

  const conta = contas.get(contaId);
  if (!conta || conta.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }

  if (valor <= 0) {
    return res.status(400).json({ error: "valor_invalido" });
  }

  if (valor > (cartao.saldoDevedor ?? 0)) {
    return res.status(400).json({ error: "valor_acima_divida" });
  }

  if (conta.saldo < valor) {
    return res.status(400).json({ error: "saldo_insuficiente" });
  }

  registarMovimento(conta.id, `Pagamento cartão de crédito ${cartao.numeroMascarado}`, -valor);
  registarMovimentoCartao(cartao.id, "Pagamento", -valor);

  res.status(201).json({ status: "concluido", novoSaldoConta: conta.saldo, novoSaldoDevedor: cartao.saldoDevedor });
});

app.post("/api/cartoes/:id/aumentar-limite", requireAuth, (req: AuthedRequest, res) => {
  const { novoLimite } = req.body ?? {};

  if (!novoLimite) {
    return res.status(400).json({ error: "campos_obrigatorios", message: "novoLimite é obrigatório" });
  }

  const cartao = cartoes.get(req.params.id);
  if (!cartao || cartao.userId !== req.userId || cartao.tipo !== "CREDITO" || cartao.estado !== "ATIVO") {
    return res.status(404).json({ error: "cartao_invalido" });
  }

  if (novoLimite <= (cartao.limite ?? 0)) {
    return res.status(400).json({ error: "limite_invalido" });
  }

  if (novoLimite > 10000) {
    return res.status(400).json({ error: "limite_maximo" });
  }

  cartao.limite = novoLimite;
  res.status(200).json({ status: "concluido", cartao: cartaoPublico(cartao) });
});

app.post("/api/cartoes/pedido-credito", requireAuth, (req: AuthedRequest, res) => {
  const { contaId, limitePretendido } = req.body ?? {};

  if (!contaId || !limitePretendido) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "contaId e limitePretendido são obrigatórios",
    });
  }

  const conta = contas.get(contaId);
  if (!conta || conta.userId !== req.userId) {
    return res.status(404).json({ error: "conta_nao_encontrada" });
  }

  if (limitePretendido <= 0) {
    return res.status(400).json({ error: "limite_invalido" });
  }

  if (limitePretendido > 10000) {
    return res.status(400).json({ error: "limite_maximo" });
  }

  const user = users.get(req.userId!);
  const cartao = criarCartao({
    userId: req.userId!,
    contaId: conta.id,
    titular: user?.nomeCompleto ?? "",
    tipo: "CREDITO",
    validade: "12/31",
    limite: limitePretendido,
    saldoDevedor: 0,
    estado: "PENDENTE_ATIVACAO",
  });

  res.status(201).json({ status: "concluido", cartao: cartaoPublico(cartao) });
});

app.post("/api/cartoes/:id/ativar-credito", requireAuth, (req: AuthedRequest, res) => {
  const { pin } = req.body ?? {};

  if (!pin) {
    return res.status(400).json({ error: "campos_obrigatorios", message: "pin é obrigatório" });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const cartao = cartoes.get(req.params.id);
  if (!cartao || cartao.userId !== req.userId || cartao.estado !== "PENDENTE_ATIVACAO") {
    return res.status(404).json({ error: "cartao_invalido" });
  }

  cartao.estado = "ATIVO";
  res.status(200).json({ status: "concluido", cartao: cartaoPublico(cartao) });
});

app.post("/api/cartoes/:id/cancelar", requireAuth, (req: AuthedRequest, res) => {
  const { pin } = req.body ?? {};

  if (!pin) {
    return res.status(400).json({ error: "campos_obrigatorios", message: "pin é obrigatório" });
  }

  const utilizador = users.get(req.userId!);
  if (!utilizador || pin !== utilizador.pin) {
    return res.status(400).json({ error: "pin_invalido" });
  }

  const cartao = cartoes.get(req.params.id);
  if (
    !cartao ||
    cartao.userId !== req.userId ||
    cartao.tipo !== "CREDITO" ||
    (cartao.estado !== "ATIVO" && cartao.estado !== "BLOQUEADO")
  ) {
    return res.status(404).json({ error: "cartao_invalido" });
  }

  if ((cartao.saldoDevedor ?? 0) > 0) {
    return res.status(400).json({ error: "saldo_devedor_pendente" });
  }

  cartao.estado = "CANCELADO";
  res.status(200).json({ status: "concluido", cartao: cartaoPublico(cartao) });
});

// -----------------------------------------------------------------------
// Operações agendadas
// -----------------------------------------------------------------------

app.get("/api/agendamentos", requireAuth, (req: AuthedRequest, res) => {
  const minhas = [...operacoesAgendadas.values()].filter((o) => o.userId === req.userId);
  res.json({ agendamentos: minhas });
});

// -----------------------------------------------------------------------
// Definições (alterar password / PIN)
// -----------------------------------------------------------------------

app.post("/api/definicoes/password", requireAuth, (req: AuthedRequest, res) => {
  const { passwordAtual, passwordNova, confirmarPasswordNova } = req.body ?? {};

  if (!passwordAtual || !passwordNova || !confirmarPasswordNova) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "passwordAtual, passwordNova e confirmarPasswordNova são obrigatórios",
    });
  }

  const user = users.get(req.userId!);
  if (!user) return res.status(404).json({ error: "utilizador_nao_encontrado" });

  // A conta de demonstração é partilhada nas instruções do README — a
  // password tem de continuar sempre "demo123" para quem seguir esse guia.
  if (user.username === "demo") {
    return res.status(403).json({ error: "conta_demo_protegida" });
  }

  if (passwordAtual !== user.password) {
    return res.status(400).json({ error: "password_atual_invalida" });
  }

  if (passwordNova.length < 6) {
    return res.status(400).json({ error: "password_nova_invalida" });
  }

  if (passwordNova !== confirmarPasswordNova) {
    return res.status(400).json({ error: "passwords_nao_coincidem" });
  }

  user.password = passwordNova;
  res.status(200).json({ status: "concluido" });
});

const PIN_REGEX = /^\d{4}$/;

app.post("/api/definicoes/pin", requireAuth, (req: AuthedRequest, res) => {
  const { pinAtual, pinNovo, confirmarPinNovo } = req.body ?? {};

  if (!pinAtual || !pinNovo || !confirmarPinNovo) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      message: "pinAtual, pinNovo e confirmarPinNovo são obrigatórios",
    });
  }

  const user = users.get(req.userId!);
  if (!user) return res.status(404).json({ error: "utilizador_nao_encontrado" });

  if (pinAtual !== user.pin) {
    return res.status(400).json({ error: "pin_atual_invalido" });
  }

  if (!PIN_REGEX.test(pinNovo)) {
    return res.status(400).json({ error: "pin_novo_invalido" });
  }

  if (pinNovo !== confirmarPinNovo) {
    return res.status(400).json({ error: "pins_nao_coincidem" });
  }

  user.pin = pinNovo;
  res.status(200).json({ status: "concluido" });
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
