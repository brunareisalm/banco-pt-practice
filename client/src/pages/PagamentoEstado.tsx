import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Conta } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";
import ConfirmarPinOverlay from "../components/ConfirmarPinOverlay";
import ResumoOperacao from "../components/ResumoOperacao";

type Passo = "dados" | "confirmar" | "resumo";

function formatarEuro(valor: number): string {
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function PagamentoEstado() {
  const { dict } = useIdioma();
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [referencia, setReferencia] = useState("");
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
      await api.pagarEstado({ contaId, referencia, valor: Number(valor), pin });
      setDataHoraConclusao(new Date().toLocaleString("pt-PT"));
      setPasso("resumo");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_insuficiente: dict.pagamentoEstado.saldoInsuficiente,
        valor_invalido: dict.pagamentoEstado.valorInvalido,
        referencia_invalida: dict.pagamentoEstado.referenciaInvalida,
        conta_nao_encontrada: dict.pagamentoEstado.contaInvalida,
        pin_invalido: dict.pagamentoEstado.pinInvalido,
      };
      setErroConfirmacao(mensagens[codigo] || dict.pagamentoEstado.erroGenerico);
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
    setReferencia("");
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
          { label: dict.pagamentoEstado.contaOrigem, valor: conta?.iban ?? "" },
          { label: dict.pagamentoEstado.referencia, valor: referencia },
          { label: dict.pagamentoEstado.valor, valor: formatarEuro(Number(valor)) },
        ]}
        dataHoraLabel={dict.operacao.dataHora}
        dataHora={dataHoraConclusao}
        estado={dict.operacao.concluida}
        onNovaOperacao={handleNovaOperacao}
        textoNovaOperacao={dict.operacao.novaOperacao}
        testIdPrefix="pagamento-estado"
      />
    );
  }

  return (
    <div className="page">
      <h2>{dict.pagamentoEstado.titulo}</h2>
      <div className="card card-form">
        <form onSubmit={handleSubmitDados}>
          <label htmlFor="contaPagamentoEstado">{dict.pagamentoEstado.contaOrigem}</label>
          <select
            id="contaPagamentoEstado"
            data-testid="pagamento-estado-conta"
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.iban} — {formatarEuro(c.saldo)}
              </option>
            ))}
          </select>

          <label htmlFor="referenciaEstado">{dict.pagamentoEstado.referencia}</label>
          <input
            id="referenciaEstado"
            data-testid="pagamento-estado-referencia"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="123456789"
            maxLength={9}
            required
          />

          <label htmlFor="valorEstado">{dict.pagamentoEstado.valor}</label>
          <input
            id="valorEstado"
            data-testid="pagamento-estado-valor"
            type="number"
            step="0.01"
            min="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />

          <button type="submit" data-testid="pagamento-estado-continuar">
            {dict.operacao.continuar}
          </button>
        </form>
      </div>

      {passo === "confirmar" && (
        <ConfirmarPinOverlay
          titulo={dict.operacao.confirmarTitulo}
          linhas={[
            { label: dict.pagamentoEstado.contaOrigem, valor: conta?.iban ?? "" },
            { label: dict.pagamentoEstado.referencia, valor: referencia },
            { label: dict.pagamentoEstado.valor, valor: formatarEuro(Number(valor)) },
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
          labelPin={dict.pagamentoEstado.pin}
          testIdPrefix="pagamento-estado"
        />
      )}
    </div>
  );
}
