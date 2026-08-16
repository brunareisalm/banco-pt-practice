import { useEffect, useState } from "react";
import { api } from "../api";
import type { OperacaoAgendada } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

export default function OperacoesAgendadas() {
  const { dict } = useIdioma();
  const [agendamentos, setAgendamentos] = useState<OperacaoAgendada[] | null>(null);

  useEffect(() => {
    api.listarAgendamentos().then(({ agendamentos }) => setAgendamentos(agendamentos));
  }, []);

  function textoEstado(estado: OperacaoAgendada["estado"]): string {
    switch (estado) {
      case "AGENDADA":
        return dict.operacoesAgendadas.agendada;
      case "CONCLUIDA":
        return dict.operacoesAgendadas.concluida;
      case "CANCELADA":
        return dict.operacoesAgendadas.cancelada;
    }
  }

  return (
    <div className="page">
      <h2>{dict.operacoesAgendadas.titulo}</h2>
      <div className="card">
        {agendamentos === null ? null : agendamentos.length === 0 ? (
          <p data-testid="operacoes-agendadas-vazio">{dict.operacoesAgendadas.semOperacoes}</p>
        ) : (
          <table className="tabela-movimentos" data-testid="operacoes-agendadas-tabela">
            <thead>
              <tr>
                <th>{dict.operacoesAgendadas.data}</th>
                <th>{dict.operacoesAgendadas.descricao}</th>
                <th>{dict.operacoesAgendadas.valor}</th>
                <th>{dict.operacoesAgendadas.estado}</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((op) => (
                <tr key={op.id} data-testid={`operacao-agendada-${op.id}`}>
                  <td>{new Date(op.dataAgendada).toLocaleDateString("pt-PT")}</td>
                  <td>{op.descricao}</td>
                  <td>{op.valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td>
                  <td>{textoEstado(op.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
