import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { Conta, Movimento } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

export default function Extratos() {
  const { dict } = useIdioma();
  const [searchParams] = useSearchParams();
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [movimentos, setMovimentos] = useState<Movimento[] | null>(null);

  useEffect(() => {
    api.listarContas().then(({ contas }) => {
      setContas(contas);
      const contaParam = searchParams.get("conta");
      const valida = contaParam && contas.some((c) => c.id === contaParam);
      setContaId((atual) => atual || (valida ? contaParam! : contas[0]?.id || ""));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiltrar(e: FormEvent) {
    e.preventDefault();
    if (!contaId) return;
    const { movimentos } = await api.listarMovimentos(contaId, {
      desde: desde || undefined,
      ate: ate || undefined,
    });
    setMovimentos(movimentos);
  }

  return (
    <div className="page">
      <h2>{dict.extratos.titulo}</h2>
      <div className="card card-form">
        <form onSubmit={handleFiltrar}>
          <label htmlFor="extratoConta">{dict.extratos.conta}</label>
          <select
            id="extratoConta"
            data-testid="extratos-conta"
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.iban}
              </option>
            ))}
          </select>

          <label htmlFor="extratoDesde">{dict.extratos.desde}</label>
          <input
            id="extratoDesde"
            data-testid="extratos-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />

          <label htmlFor="extratoAte">{dict.extratos.ate}</label>
          <input
            id="extratoAte"
            data-testid="extratos-ate"
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />

          <button type="submit" data-testid="extratos-filtrar">
            {dict.extratos.filtrar}
          </button>
        </form>
      </div>

      {movimentos !== null && (
        <div className="card">
          {movimentos.length === 0 ? (
            <p data-testid="extratos-sem-movimentos">{dict.extratos.semMovimentos}</p>
          ) : (
            <table className="tabela-movimentos" data-testid="extratos-tabela">
              <thead>
                <tr>
                  <th>{dict.extratos.data}</th>
                  <th>{dict.extratos.descricao}</th>
                  <th>{dict.extratos.valor}</th>
                  <th>{dict.extratos.saldo}</th>
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
                    <td>{mov.saldoApos.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td>
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
