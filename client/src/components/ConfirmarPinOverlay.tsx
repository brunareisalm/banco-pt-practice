import type { FormEvent } from "react";

export interface LinhaResumo {
  label: string;
  valor: string;
}

interface ConfirmarPinOverlayProps {
  titulo: string;
  linhas: LinhaResumo[];
  pin: string;
  onPinChange: (valor: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  aConfirmar: boolean;
  erro: string | null;
  textoConfirmar: string;
  textoAConfirmar: string;
  textoCancelar: string;
  labelPin: string;
  testIdPrefix: string;
}

export default function ConfirmarPinOverlay({
  titulo,
  linhas,
  pin,
  onPinChange,
  onConfirmar,
  onCancelar,
  aConfirmar,
  erro,
  textoConfirmar,
  textoAConfirmar,
  textoCancelar,
  labelPin,
  testIdPrefix,
}: ConfirmarPinOverlayProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onConfirmar();
  }

  return (
    <div className="overlay-fundo" data-testid={`${testIdPrefix}-overlay`}>
      <div className="overlay-card card">
        <h3>{titulo}</h3>

        <dl className="overlay-resumo">
          {linhas.map((linha) => (
            <div className="overlay-resumo-linha" key={linha.label}>
              <dt>{linha.label}</dt>
              <dd>{linha.valor}</dd>
            </div>
          ))}
        </dl>

        <form onSubmit={handleSubmit}>
          <label htmlFor={`${testIdPrefix}-pin-input`}>{labelPin}</label>
          <input
            id={`${testIdPrefix}-pin-input`}
            data-testid={`${testIdPrefix}-pin`}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => onPinChange(e.target.value)}
            autoFocus
            required
          />

          {erro && (
            <p className="erro" data-testid={`${testIdPrefix}-mensagem`}>
              {erro}
            </p>
          )}

          <div className="overlay-acoes">
            <button
              type="button"
              className="button-secundario"
              data-testid={`${testIdPrefix}-cancelar`}
              onClick={onCancelar}
              disabled={aConfirmar}
            >
              {textoCancelar}
            </button>
            <button type="submit" data-testid={`${testIdPrefix}-confirmar`} disabled={aConfirmar}>
              {aConfirmar ? textoAConfirmar : textoConfirmar}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
