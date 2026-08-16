import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Cartao, DadosCompletosCartao } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

const ESTADO_CLASSE: Record<Cartao["estado"], string> = {
  ATIVO: "estado-ativo",
  BLOQUEADO: "estado-bloqueado",
  PENDENTE_ATIVACAO: "estado-bloqueado",
  CANCELADO: "estado-bloqueado",
};

export default function Cartoes() {
  const { dict } = useIdioma();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aAtualizar, setAAtualizar] = useState<string | null>(null);

  const [cartaoDadosId, setCartaoDadosId] = useState<string | null>(null);
  const [pinDados, setPinDados] = useState("");
  const [aVerificarDados, setAVerificarDados] = useState(false);
  const [erroDados, setErroDados] = useState<string | null>(null);
  const [dadosRevelados, setDadosRevelados] = useState<DadosCompletosCartao | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function carregar() {
    api
      .listarCartoes()
      .then(({ cartoes }) => setCartoes(cartoes))
      .catch(() => setErro(dict.cartoes.erro))
      .finally(() => setACarregar(false));
  }

  async function alternarEstado(cartao: Cartao) {
    setAAtualizar(cartao.id);
    try {
      if (cartao.estado === "ATIVO") {
        await api.bloquearCartao(cartao.id);
      } else {
        await api.desbloquearCartao(cartao.id);
      }
      carregar();
    } finally {
      setAAtualizar(null);
    }
  }

  function abrirVerDados(cartaoId: string) {
    setCartaoDadosId(cartaoId);
    setPinDados("");
    setErroDados(null);
    setDadosRevelados(null);
  }

  function ocultarDados() {
    setCartaoDadosId(null);
    setPinDados("");
    setErroDados(null);
    setDadosRevelados(null);
  }

  async function handleVerDados(e: FormEvent) {
    e.preventDefault();
    setErroDados(null);
    setAVerificarDados(true);
    try {
      const dados = await api.obterDadosCompletosCartao(cartaoDadosId!, { pin: pinDados });
      setDadosRevelados(dados);
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        pin_invalido: dict.cartoes.pinInvalido,
      };
      setErroDados(mensagens[codigo] || dict.cartoes.erroGenerico);
      setPinDados("");
    } finally {
      setAVerificarDados(false);
    }
  }

  function textoEstado(estado: Cartao["estado"]): string {
    switch (estado) {
      case "ATIVO":
        return dict.cartoes.ativo;
      case "BLOQUEADO":
        return dict.cartoes.bloqueado;
      case "PENDENTE_ATIVACAO":
        return dict.cartoes.pendenteAtivacao;
      case "CANCELADO":
        return dict.cartoes.cancelado;
    }
  }

  if (aCarregar) return <p>{dict.cartoes.aCarregar}</p>;
  if (erro) return <p className="erro">{erro}</p>;

  return (
    <div className="page">
      <h2>{dict.cartoes.titulo}</h2>
      {cartoes.map((cartao) => {
        const podeAlternarBloqueio = cartao.estado === "ATIVO" || cartao.estado === "BLOQUEADO";
        return (
          <div className="card cartao-card" key={cartao.id} data-testid={`cartao-${cartao.id}`}>
            <div className="cartao-header">
              <div>
                <p className="cartao-tipo">
                  {cartao.tipo === "DEBITO" ? dict.cartoes.debito : dict.cartoes.credito}
                </p>
                <p className="cartao-numero" data-testid="cartao-numero">
                  {cartao.numeroMascarado}
                </p>
                <p className="cartao-titular">{cartao.titular}</p>
                <p className="cartao-validade">{dict.cartoes.validoAte(cartao.validade)}</p>
                {cartao.tipo === "CREDITO" && cartao.limite !== undefined && (
                  <p className="cartao-limite" data-testid="cartao-limite">
                    {dict.cartoes.limite}{" "}
                    {cartao.limite.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                  </p>
                )}
                {cartao.tipo === "CREDITO" && cartao.saldoDevedor !== undefined && (
                  <p className="cartao-saldo-devedor" data-testid="cartao-saldo-devedor">
                    {dict.cartaoPagar.saldoDevedor}:{" "}
                    {cartao.saldoDevedor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                  </p>
                )}
              </div>
              <span className={ESTADO_CLASSE[cartao.estado]} data-testid="cartao-estado">
                {textoEstado(cartao.estado)}
              </span>
            </div>

            <div className="cartao-acoes">
              {podeAlternarBloqueio && (
                <button
                  data-testid="cartao-toggle-estado"
                  onClick={() => alternarEstado(cartao)}
                  disabled={aAtualizar === cartao.id}
                >
                  {aAtualizar === cartao.id
                    ? dict.cartoes.aAtualizar
                    : cartao.estado === "ATIVO"
                      ? dict.cartoes.bloquear
                      : dict.cartoes.desbloquear}
                </button>
              )}

              {cartaoDadosId === cartao.id ? (
                <button type="button" className="button-secundario" data-testid="cartao-dados-ocultar" onClick={ocultarDados}>
                  {dict.cartoes.ocultarDados}
                </button>
              ) : (
                <button
                  type="button"
                  className="button-secundario"
                  data-testid="cartao-ver-dados"
                  onClick={() => abrirVerDados(cartao.id)}
                >
                  {dict.cartoes.verDados}
                </button>
              )}
            </div>

            {cartaoDadosId === cartao.id && !dadosRevelados && (
              <form className="cartao-dados-form" onSubmit={handleVerDados}>
                <label htmlFor={`cartaoDadosPin-${cartao.id}`}>{dict.cartoes.pin}</label>
                <input
                  id={`cartaoDadosPin-${cartao.id}`}
                  data-testid="cartao-dados-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinDados}
                  onChange={(e) => setPinDados(e.target.value)}
                  autoFocus
                  required
                />

                {erroDados && (
                  <p className="erro" data-testid="cartao-dados-mensagem">
                    {erroDados}
                  </p>
                )}

                <button type="submit" data-testid="cartao-dados-confirmar" disabled={aVerificarDados}>
                  {aVerificarDados ? dict.cartoes.aVerificar : dict.cartoes.confirmar}
                </button>
              </form>
            )}

            {cartaoDadosId === cartao.id && dadosRevelados && (
              <dl className="cartao-dados-revelados" data-testid="cartao-dados-revelados">
                <div className="overlay-resumo-linha">
                  <dt>{dict.cartoes.numeroCompleto}</dt>
                  <dd data-testid="cartao-dados-numero">{dadosRevelados.numeroCompleto}</dd>
                </div>
                <div className="overlay-resumo-linha">
                  <dt>{dict.cartoes.validade}</dt>
                  <dd data-testid="cartao-dados-validade">{dadosRevelados.validade}</dd>
                </div>
                <div className="overlay-resumo-linha">
                  <dt>{dict.cartoes.cvv}</dt>
                  <dd data-testid="cartao-dados-cvv">{dadosRevelados.cvv}</dd>
                </div>
                <p className="hint">{dict.cartoes.avisoDados}</p>
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
