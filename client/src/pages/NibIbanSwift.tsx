import { useEffect, useState } from "react";
import { api } from "../api";
import type { Conta } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

const SWIFT_BIC = "BPTPPTPL";

function derivarNib(iban: string): string {
  // Em Portugal, o NIB corresponde ao IBAN sem o prefixo do país ("PT" + 2 dígitos de controlo).
  return iban.slice(4);
}

export default function NibIbanSwift() {
  const { dict } = useIdioma();
  const [contas, setContas] = useState<Conta[]>([]);

  useEffect(() => {
    api.listarContas().then(({ contas }) => setContas(contas));
  }, []);

  return (
    <div className="page">
      <h2>{dict.nibIbanSwift.titulo}</h2>
      {contas.map((conta) => (
        <div className="card" key={conta.id} data-testid={`nib-iban-swift-${conta.id}`}>
          <p className="overlay-resumo-linha">
            <span>{dict.nibIbanSwift.iban}</span>
            <strong data-testid="nib-iban-swift-iban">{conta.iban}</strong>
          </p>
          <p className="overlay-resumo-linha">
            <span>{dict.nibIbanSwift.nib}</span>
            <strong data-testid="nib-iban-swift-nib">{derivarNib(conta.iban)}</strong>
          </p>
          <p className="overlay-resumo-linha">
            <span>{dict.nibIbanSwift.swift}</span>
            <strong data-testid="nib-iban-swift-swift">{SWIFT_BIC}</strong>
          </p>
        </div>
      ))}
    </div>
  );
}
