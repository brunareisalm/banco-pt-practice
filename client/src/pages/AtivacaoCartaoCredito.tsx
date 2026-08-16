import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Cartao } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

export default function AtivacaoCartaoCredito() {
  const { dict } = useIdioma();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [cartaoId, setCartaoId] = useState("");
  const [pin, setPin] = useState("");
  const [aCarregar, setACarregar] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [aAtivar, setAAtivar] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function carregar() {
    api.listarCartoes().then(({ cartoes: todos }) => {
      const pendentes = todos.filter((c) => c.estado === "PENDENTE_ATIVACAO");
      setCartoes(pendentes);
      setCartaoId(pendentes[0]?.id || "");
      setACarregar(false);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMensagem(null);
    setAAtivar(true);
    try {
      await api.ativarCartaoCredito(cartaoId, { pin });
      setMensagem({ tipo: "sucesso", texto: dict.cartaoAtivacao.sucesso });
      setPin("");
      carregar();
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        cartao_invalido: dict.cartaoAtivacao.cartaoInvalido,
        pin_invalido: dict.cartaoAtivacao.pinInvalido,
      };
      setMensagem({ tipo: "erro", texto: mensagens[codigo] || dict.cartaoAtivacao.erroGenerico });
      setPin("");
    } finally {
      setAAtivar(false);
    }
  }

  if (aCarregar) return <p>{dict.cartoes.aCarregar}</p>;

  return (
    <div className="page">
      <h2>{dict.cartaoAtivacao.titulo}</h2>

      {cartoes.length === 0 ? (
        <div className="card">
          <p>{dict.cartaoAtivacao.semCartoes}</p>
        </div>
      ) : (
        <div className="card card-form">
          <form onSubmit={handleSubmit}>
            <label htmlFor="cartaoAtivacao">{dict.cartaoAtivacao.cartao}</label>
            <select
              id="cartaoAtivacao"
              data-testid="ativacao-cartao-cartao"
              value={cartaoId}
              onChange={(e) => setCartaoId(e.target.value)}
            >
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numeroMascarado}
                </option>
              ))}
            </select>

            <label htmlFor="pinAtivacao">{dict.cartaoAtivacao.pin}</label>
            <input
              id="pinAtivacao"
              data-testid="ativacao-cartao-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />

            {mensagem && (
              <p className={mensagem.tipo === "erro" ? "erro" : "sucesso"} data-testid="ativacao-cartao-mensagem">
                {mensagem.texto}
              </p>
            )}

            <button type="submit" data-testid="ativacao-cartao-submit" disabled={aAtivar}>
              {aAtivar ? dict.cartaoAtivacao.aAtivar : dict.cartaoAtivacao.ativar}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
