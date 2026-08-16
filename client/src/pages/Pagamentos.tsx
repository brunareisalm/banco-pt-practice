import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Conta } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";
import ConfirmarPinOverlay from "../components/ConfirmarPinOverlay";
import ResumoOperacao from "../components/ResumoOperacao";

type Passo = "dados" | "confirmar" | "resumo";

function formatarEuro(valor: number): string {
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function Pagamentos() {
  const { dict } = useIdioma();
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [entidade, setEntidade] = useState("");
  const [referencia, setReferencia] = useState("");
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
      await api.pagar({
        contaId,
        entidade,
        referencia,
        valor: Number(valor),
        descricao: descricao || undefined,
        pin,
      });
      setDataHoraConclusao(new Date().toLocaleString("pt-PT"));
      setPasso("resumo");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_insuficiente: dict.pagamentos.saldoInsuficiente,
        valor_invalido: dict.pagamentos.valorInvalido,
        entidade_invalida: dict.pagamentos.entidadeInvalida,
        referencia_invalida: dict.pagamentos.referenciaInvalida,
        conta_nao_encontrada: dict.pagamentos.contaInvalida,
        pin_invalido: dict.pagamentos.pinInvalido,
      };
      setErroConfirmacao(mensagens[codigo] || dict.pagamentos.erroGenerico);
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
    setEntidade("");
    setReferencia("");
    setValor("");
    setDescricao("");
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
          { label: dict.pagamentos.contaOrigem, valor: conta?.iban ?? "" },
          { label: dict.pagamentos.entidade, valor: entidade },
          { label: dict.pagamentos.referencia, valor: referencia },
          { label: dict.pagamentos.valor, valor: formatarEuro(Number(valor)) },
          ...(descricao ? [{ label: dict.pagamentos.descricaoOpcional, valor: descricao }] : []),
        ]}
        dataHoraLabel={dict.operacao.dataHora}
        dataHora={dataHoraConclusao}
        estado={dict.operacao.concluida}
        onNovaOperacao={handleNovaOperacao}
        textoNovaOperacao={dict.operacao.novaOperacao}
        testIdPrefix="pagamento"
      />
    );
  }

  return (
    <div className="page">
      <h2>{dict.pagamentos.titulo}</h2>
      <div className="card card-form">
        <form onSubmit={handleSubmitDados}>
          <label htmlFor="contaPagamento">{dict.pagamentos.contaOrigem}</label>
          <select
            id="contaPagamento"
            data-testid="pagamento-conta"
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
          >
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.iban} — {formatarEuro(conta.saldo)}
              </option>
            ))}
          </select>

          <label htmlFor="entidade">{dict.pagamentos.entidade}</label>
          <input
            id="entidade"
            data-testid="pagamento-entidade"
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
            placeholder="12345"
            maxLength={5}
            required
          />

          <label htmlFor="referencia">{dict.pagamentos.referencia}</label>
          <input
            id="referencia"
            data-testid="pagamento-referencia"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="123456789"
            maxLength={9}
            required
          />

          <label htmlFor="valorPagamento">{dict.pagamentos.valor}</label>
          <input
            id="valorPagamento"
            data-testid="pagamento-valor"
            type="number"
            step="0.01"
            min="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />

          <label htmlFor="descricaoPagamento">{dict.pagamentos.descricaoOpcional}</label>
          <input
            id="descricaoPagamento"
            data-testid="pagamento-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          <button type="submit" data-testid="pagamento-continuar">
            {dict.operacao.continuar}
          </button>
        </form>
      </div>

      {passo === "confirmar" && (
        <ConfirmarPinOverlay
          titulo={dict.operacao.confirmarTitulo}
          linhas={[
            { label: dict.pagamentos.contaOrigem, valor: conta?.iban ?? "" },
            { label: dict.pagamentos.entidade, valor: entidade },
            { label: dict.pagamentos.referencia, valor: referencia },
            { label: dict.pagamentos.valor, valor: formatarEuro(Number(valor)) },
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
          labelPin={dict.pagamentos.pin}
          testIdPrefix="pagamento"
        />
      )}
    </div>
  );
}
