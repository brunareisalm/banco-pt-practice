import { useEffect, useState } from "react";
import { api } from "../api";
import type { Cartao, MovimentoCartao } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

export default function MovimentosCartaoCredito() {
  const { dict } = useIdioma();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [cartaoId, setCartaoId] = useState("");
  const [movimentos, setMovimentos] = useState<MovimentoCartao[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    api.listarCartoes().then(({ cartoes: todos }) => {
      const elegiveis = todos.filter((c) => c.tipo === "CREDITO");
      setCartoes(elegiveis);
      setCartaoId(elegiveis[0]?.id || "");
      setACarregar(false);
    });
  }, []);

  useEffect(() => {
    if (!cartaoId) return;
    api.listarMovimentosCartao(cartaoId).then(({ movimentos }) => setMovimentos(movimentos));
  }, [cartaoId]);

  if (aCarregar) return <p>{dict.cartoes.aCarregar}</p>;

  return (
    <div className="page">
      <h2>{dict.cartaoMovimentos.titulo}</h2>

      {cartoes.length === 0 ? (
        <div className="card">
          <p>{dict.cartaoMovimentos.semCartoes}</p>
        </div>
      ) : (
        <div className="card">
          <label htmlFor="cartaoMovimentos">{dict.cartaoMovimentos.cartao}</label>
          <select
            id="cartaoMovimentos"
            data-testid="cartao-movimentos-cartao"
            value={cartaoId}
            onChange={(e) => setCartaoId(e.target.value)}
          >
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numeroMascarado}
              </option>
            ))}
          </select>

          {movimentos.length === 0 ? (
            <p>{dict.cartaoMovimentos.semMovimentos}</p>
          ) : (
            <table className="tabela-movimentos" data-testid="tabela-movimentos-cartao">
              <thead>
                <tr>
                  <th>{dict.cartaoMovimentos.data}</th>
                  <th>{dict.cartaoMovimentos.descricao}</th>
                  <th>{dict.cartaoMovimentos.valor}</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((mov) => (
                  <tr key={mov.id}>
                    <td>{new Date(mov.data).toLocaleDateString("pt-PT")}</td>
                    <td>{mov.descricao}</td>
                    <td className={mov.valor < 0 ? "valor-negativo" : "valor-positivo"}>
                      {mov.valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
