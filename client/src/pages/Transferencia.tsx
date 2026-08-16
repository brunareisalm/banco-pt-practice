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

export default function Transferencia() {
  const { dict } = useIdioma();
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaOrigemId, setContaOrigemId] = useState("");
  const [ibanDestino, setIbanDestino] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
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
      setContaOrigemId((atual) => atual || contas[0]?.id || "");
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
      await api.transferir({
        contaOrigemId,
        ibanDestino,
        valor: Number(valor),
        descricao: descricao || undefined,
        pin,
      });
      setDataHoraConclusao(new Date().toLocaleString("pt-PT"));
      setPasso("resumo");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_insuficiente: dict.transferencia.saldoInsuficiente,
        valor_invalido: dict.transferencia.valorInvalido,
        transferencia_para_mesma_conta: dict.transferencia.mesmaConta,
        conta_origem_nao_encontrada: dict.transferencia.contaInvalida,
        pin_invalido: dict.transferencia.pinInvalido,
      };
      setErroConfirmacao(mensagens[codigo] || dict.transferencia.erroGenerico);
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
    setIbanDestino("");
    setValor("");
    setDescricao("");
    setPin("");
    setPasso("dados");
    carregarContas();
  }

  const contaOrigem = contas.find((c) => c.id === contaOrigemId);

  if (passo === "resumo") {
    return (
      <ResumoOperacao
        titulo={dict.operacao.resumoTitulo}
        linhas={[
          { label: dict.transferencia.contaOrigem, valor: contaOrigem?.iban ?? "" },
          { label: dict.transferencia.ibanDestino, valor: ibanDestino },
          { label: dict.transferencia.valor, valor: formatarEuro(Number(valor)) },
          ...(descricao ? [{ label: dict.transferencia.descricaoOpcional, valor: descricao }] : []),
        ]}
        dataHoraLabel={dict.operacao.dataHora}
        dataHora={dataHoraConclusao}
        estado={dict.operacao.concluida}
        onNovaOperacao={handleNovaOperacao}
        textoNovaOperacao={dict.operacao.novaOperacao}
        testIdPrefix="transferencia"
      />
    );
  }

  return (
    <div className="page">
      <h2>{dict.transferencia.titulo}</h2>
      <div className="card card-form">
        <form onSubmit={handleSubmitDados}>
          <label htmlFor="contaOrigem">{dict.transferencia.contaOrigem}</label>
          <select
            id="contaOrigem"
            data-testid="transferencia-origem"
            value={contaOrigemId}
            onChange={(e) => setContaOrigemId(e.target.value)}
          >
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.iban} — {formatarEuro(conta.saldo)}
              </option>
            ))}
          </select>

          <label htmlFor="ibanDestino">{dict.transferencia.ibanDestino}</label>
          <input
            id="ibanDestino"
            data-testid="transferencia-iban"
            value={ibanDestino}
            onChange={(e) => setIbanDestino(e.target.value)}
            placeholder="PT50..."
            required
          />

          <label htmlFor="valor">{dict.transferencia.valor}</label>
          <input
            id="valor"
            data-testid="transferencia-valor"
            type="number"
            step="0.01"
            min="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />

          <label htmlFor="descricao">{dict.transferencia.descricaoOpcional}</label>
          <input
            id="descricao"
            data-testid="transferencia-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          <button type="submit" data-testid="transferencia-continuar">
            {dict.operacao.continuar}
          </button>
        </form>
      </div>

      {passo === "confirmar" && (
        <ConfirmarPinOverlay
          titulo={dict.operacao.confirmarTitulo}
          linhas={[
            { label: dict.transferencia.contaOrigem, valor: contaOrigem?.iban ?? "" },
            { label: dict.transferencia.ibanDestino, valor: ibanDestino },
            { label: dict.transferencia.valor, valor: formatarEuro(Number(valor)) },
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
          labelPin={dict.transferencia.pin}
          testIdPrefix="transferencia"
        />
      )}
    </div>
  );
}
