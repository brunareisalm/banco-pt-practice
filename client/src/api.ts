const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";

function getToken() {
  return localStorage.getItem("bancoPt.token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = body?.error || `Erro ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export interface LoginResponse {
  token: string;
  user: { id: string; username: string; nomeCompleto: string };
}

export interface Conta {
  id: string;
  iban: string;
  tipo: string;
  moeda: string;
  saldo: number;
}

export interface Movimento {
  id: string;
  contaId: string;
  data: string;
  descricao: string;
  valor: number;
  saldoApos: number;
}

export interface MovimentoCartao {
  id: string;
  cartaoId: string;
  data: string;
  descricao: string;
  valor: number;
}

export interface OperacaoAgendada {
  id: string;
  descricao: string;
  valor: number;
  dataAgendada: string;
  estado: "AGENDADA" | "CONCLUIDA" | "CANCELADA";
}

export const api = {
  login: (username: string, password: string): Promise<LoginResponse> =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  registo: (data: {
    username: string;
    password: string;
    nomeCompleto: string;
    telefone: string;
  }): Promise<LoginResponse & { conta: Conta }> =>
    request("/api/auth/registo", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  listarContas: (): Promise<{ contas: Conta[] }> => request("/api/contas"),
  listarMovimentos: (contaId: string, filtro?: { desde?: string; ate?: string }): Promise<{ movimentos: Movimento[] }> => {
    const params = new URLSearchParams();
    if (filtro?.desde) params.set("desde", filtro.desde);
    if (filtro?.ate) params.set("ate", filtro.ate);
    const query = params.toString();
    return request(`/api/contas/${contaId}/movimentos${query ? `?${query}` : ""}`);
  },
  transferir: (data: {
    contaOrigemId: string;
    ibanDestino: string;
    valor: number;
    descricao?: string;
    pin: string;
  }) => request("/api/transferencias", { method: "POST", body: JSON.stringify(data) }),
  pagar: (data: {
    contaId: string;
    entidade: string;
    referencia: string;
    valor: number;
    descricao?: string;
    pin: string;
  }) => request("/api/pagamentos", { method: "POST", body: JSON.stringify(data) }),
  pagarEstado: (data: { contaId: string; referencia: string; valor: number; descricao?: string; pin: string }) =>
    request("/api/pagamentos/estado", { method: "POST", body: JSON.stringify(data) }),
  pagarSegurancaSocial: (data: {
    contaId: string;
    niss: string;
    periodo: string;
    valor: number;
    descricao?: string;
    pin: string;
  }) => request("/api/pagamentos/seguranca-social", { method: "POST", body: JSON.stringify(data) }),
  pagarTSU: (data: {
    contaId: string;
    niss: string;
    periodo: string;
    valor: number;
    descricao?: string;
    pin: string;
  }) => request("/api/pagamentos/tsu", { method: "POST", body: JSON.stringify(data) }),
  estadoMBWay: (): Promise<EstadoMBWay> => request("/api/mbway/estado"),
  ativarMBWay: (telefone: string): Promise<EstadoMBWay> =>
    request("/api/mbway/ativar", { method: "POST", body: JSON.stringify({ telefone }) }),
  pagarMBWay: (data: { contaId: string; valor: number; descricao?: string; pin: string }) =>
    request("/api/mbway/pagamentos", { method: "POST", body: JSON.stringify(data) }),
  listarCartoes: (): Promise<{ cartoes: Cartao[] }> => request("/api/cartoes"),
  bloquearCartao: (id: string): Promise<{ cartao: Cartao }> =>
    request(`/api/cartoes/${id}/bloquear`, { method: "POST" }),
  desbloquearCartao: (id: string): Promise<{ cartao: Cartao }> =>
    request(`/api/cartoes/${id}/desbloquear`, { method: "POST" }),
  listarMovimentosCartao: (id: string): Promise<{ movimentos: MovimentoCartao[] }> =>
    request(`/api/cartoes/${id}/movimentos`),
  pagarCartaoCredito: (id: string, data: { contaId: string; valor: number; pin: string }) =>
    request(`/api/cartoes/${id}/pagar`, { method: "POST", body: JSON.stringify(data) }),
  aumentarLimiteCartao: (id: string, data: { novoLimite: number }): Promise<{ cartao: Cartao }> =>
    request(`/api/cartoes/${id}/aumentar-limite`, { method: "POST", body: JSON.stringify(data) }),
  pedirCartaoCredito: (data: { contaId: string; limitePretendido: number }): Promise<{ cartao: Cartao }> =>
    request("/api/cartoes/pedido-credito", { method: "POST", body: JSON.stringify(data) }),
  ativarCartaoCredito: (id: string, data: { pin: string }): Promise<{ cartao: Cartao }> =>
    request(`/api/cartoes/${id}/ativar-credito`, { method: "POST", body: JSON.stringify(data) }),
  cancelarCartaoCredito: (id: string, data: { pin: string }): Promise<{ cartao: Cartao }> =>
    request(`/api/cartoes/${id}/cancelar`, { method: "POST", body: JSON.stringify(data) }),
  listarAgendamentos: (): Promise<{ agendamentos: OperacaoAgendada[] }> => request("/api/agendamentos"),
  criarPoupanca: (): Promise<{ conta: Conta }> => request("/api/poupancas", { method: "POST" }),
  depositarPoupanca: (id: string, data: { contaOrigemId: string; valor: number; pin: string }) =>
    request(`/api/poupancas/${id}/depositar`, { method: "POST", body: JSON.stringify(data) }),
  levantarPoupanca: (id: string, data: { contaDestinoId: string; valor: number; pin: string }) =>
    request(`/api/poupancas/${id}/levantar`, { method: "POST", body: JSON.stringify(data) }),
  excluirPoupanca: (id: string, data: { pin: string }) =>
    request(`/api/poupancas/${id}/excluir`, { method: "POST", body: JSON.stringify(data) }),
  alterarPin: (data: { pinAtual: string; pinNovo: string; confirmarPinNovo: string }) =>
    request("/api/definicoes/pin", { method: "POST", body: JSON.stringify(data) }),
  alterarPassword: (data: { passwordAtual: string; passwordNova: string; confirmarPasswordNova: string }) =>
    request("/api/definicoes/password", { method: "POST", body: JSON.stringify(data) }),
};

export interface EstadoMBWay {
  ativo: boolean;
  telefone: string | null;
}

export interface Cartao {
  id: string;
  contaId?: string;
  numeroMascarado: string;
  titular: string;
  tipo: "DEBITO" | "CREDITO";
  validade: string;
  estado: "ATIVO" | "BLOQUEADO" | "PENDENTE_ATIVACAO" | "CANCELADO";
  limite?: number;
  saldoDevedor?: number;
}

export function setToken(token: string) {
  localStorage.setItem("bancoPt.token", token);
}

export function clearToken() {
  localStorage.removeItem("bancoPt.token");
}

export function isAuthenticated() {
  return Boolean(getToken());
}
