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

export default function Carregamentos() {
  const { dict } = useIdioma();
  const [contas, setContas] = useState<Conta[]>([]);
  const [operadores, setOperadores] = useState<string[]>([]);
  const [valores, setValores] = useState<number[]>([]);
  const [contaId, setContaId] = useState("");
  const [operador, setOperador] = useState("");
  const [numero, setNumero] = useState("");
  const [valor, setValor] = useState("");
  const [pin, setPin] = useState("");
  const [aCarregar, setACarregar] = useState(true);

  const [passo, setPasso] = useState<Passo>("dados");
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [aConfirmar, setAConfirmar] = useState(false);
  const [dataHoraConclusao, setDataHoraConclusao] = useState("");

  useEffect(() => {
    carregarDadosIniciais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function carregarDadosIniciais() {
    Promise.all([api.listarContas(), api.opcoesCarregamento()]).then(
      ([{ contas }, { operadores, valores }]) => {
        setContas(contas);
        setOperadores(operadores);
        setValores(valores);
        setContaId((atual) => atual || contas[0]?.id || "");
        setOperador((atual) => atual || operadores[0] || "");
        setValor((atual) => atual || String(valores[0] ?? ""));
        setACarregar(false);
      }
    );
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
      await api.carregarTelemovel({ contaId, operador, numero, valor: Number(valor), pin });
      setDataHoraConclusao(new Date().toLocaleString("pt-PT"));
      setPasso("resumo");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_insuficiente: dict.carregamentos.saldoInsuficiente,
        valor_invalido: dict.carregamentos.valorInvalido,
        numero_invalido: dict.carregamentos.numeroInvalido,
        operador_invalido: dict.carregamentos.operadorInvalido,
        conta_nao_encontrada: dict.carregamentos.contaInvalida,
        pin_invalido: dict.carregamentos.pinInvalido,
      };
      setErroConfirmacao(mensagens[codigo] || dict.carregamentos.erroGenerico);
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
    setNumero("");
    setPin("");
    setPasso("dados");
    setACarregar(true);
    carregarDadosIniciais();
  }

  const conta = contas.find((c) => c.id === contaId);

  if (aCarregar) return <p>{dict.carregamentos.aCarregarPagina}</p>;

  if (passo === "resumo") {
    return (
      <ResumoOperacao
        titulo={dict.operacao.resumoTitulo}
        linhas={[
          { label: dict.carregamentos.operador, valor: operador },
          { label: dict.carregamentos.numero, valor: numero },
          { label: dict.carregamentos.valor, valor: formatarEuro(Number(valor)) },
        ]}
        dataHoraLabel={dict.operacao.dataHora}
        dataHora={dataHoraConclusao}
        estado={dict.operacao.concluida}
        onNovaOperacao={handleNovaOperacao}
        textoNovaOperacao={dict.operacao.novaOperacao}
        testIdPrefix="carregamento"
      />
    );
  }

  return (
    <div className="page">
      <h2>{dict.carregamentos.titulo}</h2>

      <div className="card card-form">
        <form onSubmit={handleSubmitDados}>
          <label htmlFor="carregamentoConta">{dict.carregamentos.contaOrigem}</label>
          <select
            id="carregamentoConta"
            data-testid="carregamento-conta"
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.iban} — {formatarEuro(c.saldo)}
              </option>
            ))}
          </select>

          <label htmlFor="carregamentoOperador">{dict.carregamentos.operador}</label>
          <select
            id="carregamentoOperador"
            data-testid="carregamento-operador"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
          >
            {operadores.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>

          <label htmlFor="carregamentoNumero">{dict.carregamentos.numero}</label>
          <input
            id="carregamentoNumero"
            data-testid="carregamento-numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="912345678"
            maxLength={9}
            required
          />

          <label htmlFor="carregamentoValor">{dict.carregamentos.valor}</label>
          <select
            id="carregamentoValor"
            data-testid="carregamento-valor"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          >
            {valores.map((v) => (
              <option key={v} value={v}>
                {formatarEuro(v)}
              </option>
            ))}
          </select>

          <button type="submit" data-testid="carregamento-continuar">
            {dict.operacao.continuar}
          </button>
        </form>
      </div>

      {passo === "confirmar" && (
        <ConfirmarPinOverlay
          titulo={dict.operacao.confirmarTitulo}
          linhas={[
            { label: dict.carregamentos.contaOrigem, valor: conta?.iban ?? "" },
            { label: dict.carregamentos.operador, valor: operador },
            { label: dict.carregamentos.numero, valor: numero },
            { label: dict.carregamentos.valor, valor: formatarEuro(Number(valor)) },
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
          labelPin={dict.carregamentos.pin}
          testIdPrefix="carregamento"
        />
      )}
    </div>
  );
}
