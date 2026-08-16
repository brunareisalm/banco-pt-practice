import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Cartao, Conta } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";
import ConfirmarPinOverlay from "../components/ConfirmarPinOverlay";
import ResumoOperacao from "../components/ResumoOperacao";

type Passo = "dados" | "confirmar" | "resumo";

function formatarEuro(valor: number): string {
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function PagarCartaoCredito() {
  const { dict } = useIdioma();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [cartaoId, setCartaoId] = useState("");
  const [contaId, setContaId] = useState("");
  const [valor, setValor] = useState("");
  const [pin, setPin] = useState("");
  const [aCarregar, setACarregar] = useState(true);

  const [passo, setPasso] = useState<Passo>("dados");
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [aConfirmar, setAConfirmar] = useState(false);
  const [dataHoraConclusao, setDataHoraConclusao] = useState("");

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function carregar() {
    Promise.all([api.listarCartoes(), api.listarContas()]).then(([{ cartoes: todosCartoes }, { contas }]) => {
      const elegiveis = todosCartoes.filter(
        (c) => c.tipo === "CREDITO" && c.estado === "ATIVO" && (c.saldoDevedor ?? 0) > 0
      );
      setCartoes(elegiveis);
      setContas(contas);
      setCartaoId((atual) => atual || elegiveis[0]?.id || "");
      setContaId((atual) => atual || contas[0]?.id || "");
      setACarregar(false);
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
      await api.pagarCartaoCredito(cartaoId, { contaId, valor: Number(valor), pin });
      setDataHoraConclusao(new Date().toLocaleString("pt-PT"));
      setPasso("resumo");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_insuficiente: dict.cartaoPagar.saldoInsuficiente,
        valor_invalido: dict.cartaoPagar.valorInvalido,
        valor_acima_divida: dict.cartaoPagar.valorAcimaDivida,
        cartao_invalido: dict.cartaoPagar.cartaoInvalido,
        conta_nao_encontrada: dict.cartaoPagar.contaInvalida,
        pin_invalido: dict.cartaoPagar.pinInvalido,
      };
      setErroConfirmacao(mensagens[codigo] || dict.cartaoPagar.erroGenerico);
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
    setValor("");
    setPin("");
    setPasso("dados");
    setACarregar(true);
    carregar();
  }

  const cartao = cartoes.find((c) => c.id === cartaoId);
  const conta = contas.find((c) => c.id === contaId);

  if (aCarregar) return <p>{dict.cartoes.aCarregar}</p>;

  if (passo === "resumo") {
    return (
      <ResumoOperacao
        titulo={dict.operacao.resumoTitulo}
        linhas={[
          { label: dict.cartaoPagar.cartao, valor: cartao?.numeroMascarado ?? "" },
          { label: dict.cartaoPagar.contaOrigem, valor: conta?.iban ?? "" },
          { label: dict.cartaoPagar.valor, valor: formatarEuro(Number(valor)) },
        ]}
        dataHoraLabel={dict.operacao.dataHora}
        dataHora={dataHoraConclusao}
        estado={dict.operacao.concluida}
        onNovaOperacao={handleNovaOperacao}
        textoNovaOperacao={dict.operacao.novaOperacao}
        testIdPrefix="cartao-pagar"
      />
    );
  }

  return (
    <div className="page">
      <h2>{dict.cartaoPagar.titulo}</h2>

      {cartoes.length === 0 ? (
        <div className="card">
          <p>{dict.cartaoPagar.semCartoes}</p>
        </div>
      ) : (
        <div className="card card-form">
          <form onSubmit={handleSubmitDados}>
            <label htmlFor="cartaoPagar">{dict.cartaoPagar.cartao}</label>
            <select
              id="cartaoPagar"
              data-testid="cartao-pagar-cartao"
              value={cartaoId}
              onChange={(e) => setCartaoId(e.target.value)}
            >
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numeroMascarado} — {dict.cartaoPagar.saldoDevedor}: {formatarEuro(c.saldoDevedor ?? 0)}
                </option>
              ))}
            </select>

            <label htmlFor="contaPagarCartao">{dict.cartaoPagar.contaOrigem}</label>
            <select
              id="contaPagarCartao"
              data-testid="cartao-pagar-conta"
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
            >
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.iban} — {formatarEuro(c.saldo)}
                </option>
              ))}
            </select>

            <label htmlFor="valorPagarCartao">{dict.cartaoPagar.valor}</label>
            <input
              id="valorPagarCartao"
              data-testid="cartao-pagar-valor"
              type="number"
              step="0.01"
              min="0.01"
              max={cartao?.saldoDevedor}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />

            <button type="submit" data-testid="cartao-pagar-continuar">
              {dict.operacao.continuar}
            </button>
          </form>
        </div>
      )}

      {passo === "confirmar" && (
        <ConfirmarPinOverlay
          titulo={dict.operacao.confirmarTitulo}
          linhas={[
            { label: dict.cartaoPagar.cartao, valor: cartao?.numeroMascarado ?? "" },
            { label: dict.cartaoPagar.contaOrigem, valor: conta?.iban ?? "" },
            { label: dict.cartaoPagar.valor, valor: formatarEuro(Number(valor)) },
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
          labelPin={dict.cartaoPagar.pin}
          testIdPrefix="cartao-pagar"
        />
      )}
    </div>
  );
}
