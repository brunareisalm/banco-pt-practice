import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { Conta, Movimento } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

const DIAS_JANELA = 90;

function formatarEuro(valor: number): string {
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function SaldosMovimentos() {
  const { dict } = useIdioma();
  const [searchParams] = useSearchParams();
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    api.listarContas().then(({ contas }) => {
      setContas(contas);
      const contaParam = searchParams.get("conta");
      const valida = contaParam && contas.some((c) => c.id === contaParam);
      setContaId(valida ? contaParam! : contas[0]?.id || "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!contaId) return;
    setACarregar(true);
    const desde = new Date(Date.now() - DIAS_JANELA * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    api.listarMovimentos(contaId, { desde }).then(({ movimentos }) => {
      setMovimentos(movimentos);
      setACarregar(false);
    });
  }, [contaId]);

  const conta = contas.find((c) => c.id === contaId);

  return (
    <div className="page">
      <h2>{dict.saldosMovimentos.titulo}</h2>

      <div className="card card-form">
        <label htmlFor="saldosMovimentosConta">{dict.saldosMovimentos.conta}</label>
        <select
          id="saldosMovimentosConta"
          data-testid="saldos-movimentos-conta"
          value={contaId}
          onChange={(e) => setContaId(e.target.value)}
        >
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.iban} — {formatarEuro(c.saldo)}
            </option>
          ))}
        </select>
      </div>

      {conta && (
        <div className="card">
          <p className="conta-saldo" data-testid="saldos-movimentos-saldo">
            {formatarEuro(conta.saldo)}
          </p>
          <p className="conta-tipo">{dict.saldosMovimentos.periodo(DIAS_JANELA)}</p>
        </div>
      )}

      {aCarregar ? (
        <p>{dict.saldosMovimentos.aCarregar}</p>
      ) : (
        <div className="card">
          {movimentos.length === 0 ? (
            <p data-testid="saldos-movimentos-sem-movimentos">{dict.saldosMovimentos.semMovimentos}</p>
          ) : (
            <table className="tabela-movimentos" data-testid="saldos-movimentos-tabela">
              <thead>
                <tr>
                  <th>{dict.saldosMovimentos.data}</th>
                  <th>{dict.saldosMovimentos.descricao}</th>
                  <th>{dict.saldosMovimentos.valor}</th>
                  <th>{dict.saldosMovimentos.saldo}</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((mov) => (
                  <tr key={mov.id}>
                    <td>{new Date(mov.data).toLocaleDateString("pt-PT")}</td>
                    <td>{mov.descricao}</td>
                    <td className={mov.valor < 0 ? "valor-negativo" : "valor-positivo"}>
                      {formatarEuro(mov.valor)}
                    </td>
                    <td>{formatarEuro(mov.saldoApos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <Link
            to={contaId ? `/consultas/extratos?conta=${contaId}` : "/consultas/extratos"}
            data-testid="saldos-movimentos-ver-mais-antigos"
          >
            {dict.saldosMovimentos.verMaisAntigos}
          </Link>
        </div>
      )}
    </div>
  );
}
