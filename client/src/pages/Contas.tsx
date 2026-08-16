import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Conta, Movimento } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

export default function Contas() {
  const { dict } = useIdioma();
  const [contas, setContas] = useState<Conta[]>([]);
  const [movimentosPorConta, setMovimentosPorConta] = useState<Record<string, Movimento[]>>({});
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const { contas } = await api.listarContas();
        setContas(contas);
        for (const conta of contas) {
          const { movimentos } = await api.listarMovimentos(conta.id);
          setMovimentosPorConta((prev) => ({ ...prev, [conta.id]: movimentos.slice(0, 5) }));
        }
      } catch {
        setErro(dict.contas.erro);
      } finally {
        setACarregar(false);
      }
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (aCarregar) return <p>{dict.contas.aCarregar}</p>;
  if (erro) return <p className="erro">{erro}</p>;

  return (
    <div className="page">
      <h2>{dict.contas.titulo}</h2>
      {contas.map((conta) => (
        <div className="card conta-card" key={conta.id} data-testid={`conta-${conta.id}`}>
          <div className="conta-header">
            <div>
              <p className="conta-tipo">
                {conta.tipo === "DO"
                  ? dict.contas.contaOrdem
                  : conta.tipo === "POUPANCA"
                    ? dict.contas.contaPoupanca
                    : dict.contas.contaPrazo}
              </p>
              <p className="conta-iban" data-testid="conta-iban">
                {conta.iban}
              </p>
            </div>
            <p className="conta-saldo" data-testid="conta-saldo">
              {conta.saldo.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
            </p>
          </div>

          <h4>{dict.contas.ultimosMovimentos}</h4>
          <ul className="movimentos-lista">
            {(movimentosPorConta[conta.id] ?? []).map((mov) => (
              <li key={mov.id}>
                <span>{mov.descricao}</span>
                <span className={mov.valor < 0 ? "valor-negativo" : "valor-positivo"}>
                  {mov.valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                </span>
              </li>
            ))}
          </ul>
          <Link to={`/consultas/saldos-e-movimentos?conta=${conta.id}`}>{dict.contas.verSaldosMovimentos}</Link>
        </div>
      ))}
    </div>
  );
}
