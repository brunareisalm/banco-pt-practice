import type { LinhaResumo } from "./ConfirmarPinOverlay";

interface ResumoOperacaoProps {
  titulo: string;
  linhas: LinhaResumo[];
  dataHoraLabel: string;
  dataHora: string;
  estado: string;
  onNovaOperacao: () => void;
  textoNovaOperacao: string;
  testIdPrefix: string;
}

export default function ResumoOperacao({
  titulo,
  linhas,
  dataHoraLabel,
  dataHora,
  estado,
  onNovaOperacao,
  textoNovaOperacao,
  testIdPrefix,
}: ResumoOperacaoProps) {
  return (
    <div className="page" data-testid={`${testIdPrefix}-resumo`}>
      <h2>{titulo}</h2>
      <div className="card">
        <p className="resumo-estado" data-testid={`${testIdPrefix}-resumo-estado`}>
          <span className="estado-ativo">{estado}</span>
        </p>

        <dl className="overlay-resumo">
          {linhas.map((linha) => (
            <div className="overlay-resumo-linha" key={linha.label}>
              <dt>{linha.label}</dt>
              <dd>{linha.valor}</dd>
            </div>
          ))}
          <div className="overlay-resumo-linha">
            <dt>{dataHoraLabel}</dt>
            <dd data-testid={`${testIdPrefix}-resumo-data`}>{dataHora}</dd>
          </div>
        </dl>

        <button data-testid={`${testIdPrefix}-nova-operacao`} onClick={onNovaOperacao}>
          {textoNovaOperacao}
        </button>
      </div>
    </div>
  );
}
