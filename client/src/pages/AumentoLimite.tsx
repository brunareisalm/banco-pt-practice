import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Cartao } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

function formatarEuro(valor: number): string {
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function AumentoLimite() {
  const { dict } = useIdioma();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [cartaoId, setCartaoId] = useState("");
  const [novoLimite, setNovoLimite] = useState("");
  const [aCarregar, setACarregar] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function carregar() {
    api.listarCartoes().then(({ cartoes: todos }) => {
      const elegiveis = todos.filter((c) => c.tipo === "CREDITO" && c.estado === "ATIVO");
      setCartoes(elegiveis);
      setCartaoId((atual) => atual || elegiveis[0]?.id || "");
      setACarregar(false);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMensagem(null);
    setAEnviar(true);
    try {
      const { cartao } = await api.aumentarLimiteCartao(cartaoId, { novoLimite: Number(novoLimite) });
      setMensagem({ tipo: "sucesso", texto: dict.cartaoAumentoLimite.sucesso });
      setNovoLimite("");
      setCartoes((atual) => atual.map((c) => (c.id === cartao.id ? cartao : c)));
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        limite_invalido: dict.cartaoAumentoLimite.limiteInvalido,
        limite_maximo: dict.cartaoAumentoLimite.limiteMaximo,
        cartao_invalido: dict.cartaoAumentoLimite.cartaoInvalido,
      };
      setMensagem({ tipo: "erro", texto: mensagens[codigo] || dict.cartaoAumentoLimite.erroGenerico });
    } finally {
      setAEnviar(false);
    }
  }

  const cartao = cartoes.find((c) => c.id === cartaoId);

  if (aCarregar) return <p>{dict.cartoes.aCarregar}</p>;

  return (
    <div className="page">
      <h2>{dict.cartaoAumentoLimite.titulo}</h2>

      {cartoes.length === 0 ? (
        <div className="card">
          <p>{dict.cartaoAumentoLimite.semCartoes}</p>
        </div>
      ) : (
        <div className="card card-form">
          <form onSubmit={handleSubmit}>
            <label htmlFor="cartaoAumento">{dict.cartaoAumentoLimite.cartao}</label>
            <select
              id="cartaoAumento"
              data-testid="aumento-limite-cartao"
              value={cartaoId}
              onChange={(e) => setCartaoId(e.target.value)}
            >
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numeroMascarado} — {dict.cartaoAumentoLimite.limiteAtual}: {formatarEuro(c.limite ?? 0)}
                </option>
              ))}
            </select>

            <p className="hint" data-testid="aumento-limite-atual">
              {dict.cartaoAumentoLimite.limiteAtual}: {formatarEuro(cartao?.limite ?? 0)}
            </p>

            <label htmlFor="novoLimite">{dict.cartaoAumentoLimite.novoLimite}</label>
            <input
              id="novoLimite"
              data-testid="aumento-limite-novo-limite"
              type="number"
              step="0.01"
              min="0.01"
              value={novoLimite}
              onChange={(e) => setNovoLimite(e.target.value)}
              required
            />

            {mensagem && (
              <p
                className={mensagem.tipo === "erro" ? "erro" : "sucesso"}
                data-testid="aumento-limite-mensagem"
              >
                {mensagem.texto}
              </p>
            )}

            <button type="submit" data-testid="aumento-limite-submit" disabled={aEnviar}>
              {aEnviar ? dict.cartaoAumentoLimite.aEnviar : dict.cartaoAumentoLimite.pedirAumento}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
