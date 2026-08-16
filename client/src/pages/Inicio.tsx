import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Conta } from "../api";
import { useAuth } from "../context/AuthContext";
import { useIdioma } from "../i18n/IdiomaContext";

export default function Inicio() {
  const { user } = useAuth();
  const { dict } = useIdioma();
  const [contas, setContas] = useState<Conta[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .listarContas()
      .then(({ contas }) => setContas(contas))
      .catch(() => setErro(dict.inicio.erroContas))
      .finally(() => setACarregar(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saldoTotal = contas.reduce((soma, conta) => soma + conta.saldo, 0);

  const acessosRapidos = [
    { slug: "contas", label: dict.nav.contas, icone: "💳", to: "/contas" },
    { slug: "transferencia", label: dict.nav.transferir, icone: "🔁", to: "/transferencia" },
    { slug: "pagamentos", label: dict.nav.pagamentos, icone: "🧾", to: "/pagamentos" },
    { slug: "mbway", label: dict.nav.mbway, icone: "📱", to: "/mbway" },
    { slug: "cartoes", label: dict.nav.cartoes, icone: "🪪", to: "/cartoes" },
  ];

  return (
    <div className="page">
      <h2>
        {dict.inicio.saudacao}, {user?.nomeCompleto}
      </h2>

      {aCarregar && <p>{dict.inicio.aCarregarResumo}</p>}
      {erro && <p className="erro">{erro}</p>}

      {!aCarregar && !erro && (
        <div className="card resumo-saldo">
          <p className="resumo-saldo-label">{dict.inicio.saldoTotal(contas.length)}</p>
          <p className="resumo-saldo-valor" data-testid="saldo-total">
            {saldoTotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
          </p>
        </div>
      )}

      <h3>{dict.inicio.acessoRapido}</h3>
      <div className="acessos-rapidos">
        {acessosRapidos.map((acesso) => (
          <Link
            key={acesso.slug}
            to={acesso.to}
            className="acesso-rapido-card"
            data-testid={`acesso-rapido-${acesso.slug}`}
          >
            <span className="acesso-rapido-icone" aria-hidden="true">
              {acesso.icone}
            </span>
            <span>{acesso.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
