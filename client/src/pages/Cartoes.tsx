import { useEffect, useState } from "react";
import { api } from "../api";
import type { Cartao } from "../api";
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
          </div>
        );
      })}
    </div>
  );
}
