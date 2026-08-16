import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Conta } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";
import type { Dicionario } from "../i18n/translations";
import ConfirmarPinOverlay from "../components/ConfirmarPinOverlay";
import ResumoOperacao from "../components/ResumoOperacao";

type Passo = "dados" | "confirmar" | "resumo";
type DictKey = "pagamentoSegurancaSocial" | "pagamentoTSU";

function formatarEuro(valor: number): string {
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

interface PagamentoSocialProps {
  dictKey: DictKey;
  apiFn: (data: {
    contaId: string;
    niss: string;
    periodo: string;
    valor: number;
    pin: string;
  }) => Promise<unknown>;
  testIdPrefix: string;
}

export default function PagamentoSocial({ dictKey, apiFn, testIdPrefix }: PagamentoSocialProps) {
  const { dict } = useIdioma();
  const textos: Dicionario[DictKey] = dict[dictKey];

  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [niss, setNiss] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [valor, setValor] = useState("");
  const [pin, setPin] = useState("");

  const [passo, setPasso] = useState<Passo>("dados");
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [aConfirmar, setAConfirmar] = useState(false);
  const [dataHoraConclusao, setDataHoraConclusao] = useState("");

  useEffect(() => {
    carregarContas();
  }, []);

  function carregarContas() {
    api.listarContas().then(({ contas }) => {
      setContas(contas);
      setContaId((atual) => atual || contas[0]?.id || "");
    });
  }

  function handleSubmitDados(e: FormEvent) {
    e.preventDefault();
    setErroConfirmacao(null);
    setPasso("confirmar");
  }

  async function handleConfirmar() {
    setErroConfirmacao(null);
    setAConfirmar(true);
    try {
      await apiFn({ contaId, niss, periodo, valor: Number(valor), pin });
      setDataHoraConclusao(new Date().toLocaleString("pt-PT"));
      setPasso("resumo");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_insuficiente: textos.saldoInsuficiente,
        valor_invalido: textos.valorInvalido,
        niss_invalido: textos.nissInvalido,
        periodo_invalido: textos.periodoInvalido,
        conta_nao_encontrada: textos.contaInvalida,
        pin_invalido: textos.pinInvalido,
      };
      setErroConfirmacao(mensagens[codigo] || textos.erroGenerico);
      setPin("");
    } finally {
      setAConfirmar(false);
    }
  }

  function handleCancelar() {
    setPasso("dados");
    setErroConfirmacao(null);
    setPin("");
  }

  function handleNovaOperacao() {
    setNiss("");
    setPeriodo("");
    setValor("");
    setPin("");
    setPasso("dados");
    carregarContas();
  }

  const conta = contas.find((c) => c.id === contaId);

  if (passo === "resumo") {
    return (
      <ResumoOperacao
        titulo={dict.operacao.resumoTitulo}
        linhas={[
          { label: textos.contaOrigem, valor: conta?.iban ?? "" },
          { label: textos.niss, valor: niss },
          { label: textos.periodo, valor: periodo },
          { label: textos.valor, valor: formatarEuro(Number(valor)) },
        ]}
        dataHoraLabel={dict.operacao.dataHora}
        dataHora={dataHoraConclusao}
        estado={dict.operacao.concluida}
        onNovaOperacao={handleNovaOperacao}
        textoNovaOperacao={dict.operacao.novaOperacao}
        testIdPrefix={testIdPrefix}
      />
    );
  }

  return (
    <div className="page">
      <h2>{textos.titulo}</h2>
      <div className="card card-form">
        <form onSubmit={handleSubmitDados}>
          <label htmlFor={`${testIdPrefix}-conta-input`}>{textos.contaOrigem}</label>
          <select
            id={`${testIdPrefix}-conta-input`}
            data-testid={`${testIdPrefix}-conta`}
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.iban} — {formatarEuro(c.saldo)}
              </option>
            ))}
          </select>

          <label htmlFor={`${testIdPrefix}-niss-input`}>{textos.niss}</label>
          <input
            id={`${testIdPrefix}-niss-input`}
            data-testid={`${testIdPrefix}-niss`}
            value={niss}
            onChange={(e) => setNiss(e.target.value)}
            placeholder="12345678901"
            maxLength={11}
            required
          />

          <label htmlFor={`${testIdPrefix}-periodo-input`}>{textos.periodo}</label>
          <input
            id={`${testIdPrefix}-periodo-input`}
            data-testid={`${testIdPrefix}-periodo`}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            placeholder="01/2026"
            maxLength={7}
            required
          />

          <label htmlFor={`${testIdPrefix}-valor-input`}>{textos.valor}</label>
          <input
            id={`${testIdPrefix}-valor-input`}
            data-testid={`${testIdPrefix}-valor`}
            type="number"
            step="0.01"
            min="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />

          <button type="submit" data-testid={`${testIdPrefix}-continuar`}>
            {dict.operacao.continuar}
          </button>
        </form>
      </div>

      {passo === "confirmar" && (
        <ConfirmarPinOverlay
          titulo={dict.operacao.confirmarTitulo}
          linhas={[
            { label: textos.contaOrigem, valor: conta?.iban ?? "" },
            { label: textos.niss, valor: niss },
            { label: textos.periodo, valor: periodo },
            { label: textos.valor, valor: formatarEuro(Number(valor)) },
          ]}
          pin={pin}
          onPinChange={setPin}
          onConfirmar={handleConfirmar}
          onCancelar={handleCancelar}
          aConfirmar={aConfirmar}
          erro={erroConfirmacao}
          textoConfirmar={dict.operacao.confirmar}
          textoAConfirmar={dict.operacao.aConfirmar}
          textoCancelar={dict.operacao.cancelar}
          labelPin={textos.pin}
          testIdPrefix={testIdPrefix}
        />
      )}
    </div>
  );
}
