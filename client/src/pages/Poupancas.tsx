import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Conta } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";
import ConfirmarPinOverlay from "../components/ConfirmarPinOverlay";
import ResumoOperacao from "../components/ResumoOperacao";

type Visao = "lista" | "depositar" | "levantar";
type Passo = "dados" | "confirmar" | "resumo";

function formatarEuro(valor: number): string {
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function Poupancas() {
  const { dict } = useIdioma();
  const [poupancas, setPoupancas] = useState<Conta[]>([]);
  const [contasDO, setContasDO] = useState<Conta[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [aCriar, setACriar] = useState(false);
  const [mensagemCriacao, setMensagemCriacao] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const [poupancaExcluirId, setPoupancaExcluirId] = useState<string | null>(null);
  const [pinExcluir, setPinExcluir] = useState("");
  const [aExcluir, setAExcluir] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const [visao, setVisao] = useState<Visao>("lista");
  const [poupancaMovimentoId, setPoupancaMovimentoId] = useState("");
  const [contaMovimentoId, setContaMovimentoId] = useState("");
  const [valor, setValor] = useState("");
  const [pin, setPin] = useState("");
  const [passo, setPasso] = useState<Passo>("dados");
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [aConfirmar, setAConfirmar] = useState(false);
  const [dataHoraConclusao, setDataHoraConclusao] = useState("");

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function carregar() {
    api
      .listarContas()
      .then(({ contas }) => {
        setPoupancas(contas.filter((c) => c.tipo === "POUPANCA"));
        setContasDO(contas.filter((c) => c.tipo !== "POUPANCA"));
      })
      .catch(() => setErro(dict.poupancas.erro))
      .finally(() => setACarregar(false));
  }

  async function handleCriar() {
    setACriar(true);
    setMensagemCriacao(null);
    try {
      await api.criarPoupanca();
      setMensagemCriacao({ tipo: "sucesso", texto: dict.poupancas.criarSucesso });
      carregar();
    } catch {
      setMensagemCriacao({ tipo: "erro", texto: dict.poupancas.criarErro });
    } finally {
      setACriar(false);
    }
  }

  function abrirMovimento(tipo: "depositar" | "levantar", poupancaId: string) {
    setVisao(tipo);
    setPoupancaMovimentoId(poupancaId);
    setContaMovimentoId(contasDO[0]?.id || "");
    setValor("");
    setPin("");
    setPasso("dados");
    setErroConfirmacao(null);
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
      if (visao === "depositar") {
        await api.depositarPoupanca(poupancaMovimentoId, {
          contaOrigemId: contaMovimentoId,
          valor: Number(valor),
          pin,
        });
      } else {
        await api.levantarPoupanca(poupancaMovimentoId, {
          contaDestinoId: contaMovimentoId,
          valor: Number(valor),
          pin,
        });
      }
      setDataHoraConclusao(new Date().toLocaleString("pt-PT"));
      setPasso("resumo");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_insuficiente: dict.poupancas.saldoInsuficiente,
        valor_invalido: dict.poupancas.valorInvalido,
        conta_nao_encontrada: dict.poupancas.contaInvalida,
        poupanca_invalida: dict.poupancas.poupancaInvalida,
        pin_invalido: dict.poupancas.pinInvalido,
      };
      setErroConfirmacao(mensagens[codigo] || dict.poupancas.erroGenerico);
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
    setVisao("lista");
    setACarregar(true);
    carregar();
  }

  async function handleExcluir(e: FormEvent) {
    e.preventDefault();
    setErroExcluir(null);
    setAExcluir(true);
    try {
      await api.excluirPoupanca(poupancaExcluirId!, { pin: pinExcluir });
      setPoupancaExcluirId(null);
      setPinExcluir("");
      carregar();
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_nao_zero: dict.poupancas.saldoNaoZero,
        pin_invalido: dict.poupancas.pinInvalido,
        poupanca_invalida: dict.poupancas.poupancaInvalida,
      };
      setErroExcluir(mensagens[codigo] || dict.poupancas.erroGenerico);
      setPinExcluir("");
    } finally {
      setAExcluir(false);
    }
  }

  const poupancaAtual = poupancas.find((p) => p.id === poupancaMovimentoId);
  const contaAtual = contasDO.find((c) => c.id === contaMovimentoId);

  if (aCarregar) return <p>{dict.poupancas.aCarregar}</p>;
  if (erro) return <p className="erro">{erro}</p>;

  if (passo === "resumo") {
    return (
      <ResumoOperacao
        titulo={dict.operacao.resumoTitulo}
        linhas={[
          { label: dict.poupancas.poupanca, valor: poupancaAtual?.iban ?? "" },
          {
            label: visao === "depositar" ? dict.poupancas.contaOrigem : dict.poupancas.contaDestino,
            valor: contaAtual?.iban ?? "",
          },
          { label: dict.poupancas.valor, valor: formatarEuro(Number(valor)) },
        ]}
        dataHoraLabel={dict.operacao.dataHora}
        dataHora={dataHoraConclusao}
        estado={dict.operacao.concluida}
        onNovaOperacao={handleNovaOperacao}
        textoNovaOperacao={dict.operacao.novaOperacao}
        testIdPrefix="poupanca-movimento"
      />
    );
  }

  if (visao !== "lista") {
    return (
      <div className="page">
        <h2>{visao === "depositar" ? dict.poupancas.depositarTitulo : dict.poupancas.levantarTitulo}</h2>

        <div className="card card-form">
          <form onSubmit={handleSubmitDados}>
            <label htmlFor="poupancaMovimentoPoupanca">{dict.poupancas.poupanca}</label>
            <select
              id="poupancaMovimentoPoupanca"
              data-testid="poupanca-movimento-poupanca"
              value={poupancaMovimentoId}
              onChange={(e) => setPoupancaMovimentoId(e.target.value)}
            >
              {poupancas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.iban} — {formatarEuro(p.saldo)}
                </option>
              ))}
            </select>

            <label htmlFor="poupancaMovimentoConta">
              {visao === "depositar" ? dict.poupancas.contaOrigem : dict.poupancas.contaDestino}
            </label>
            <select
              id="poupancaMovimentoConta"
              data-testid="poupanca-movimento-conta"
              value={contaMovimentoId}
              onChange={(e) => setContaMovimentoId(e.target.value)}
            >
              {contasDO.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.iban} — {formatarEuro(c.saldo)}
                </option>
              ))}
            </select>

            <label htmlFor="poupancaMovimentoValor">{dict.poupancas.valor}</label>
            <input
              id="poupancaMovimentoValor"
              data-testid="poupanca-movimento-valor"
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />

            <button type="submit" data-testid="poupanca-movimento-continuar">
              {dict.operacao.continuar}
            </button>
            <button
              type="button"
              className="button-secundario"
              data-testid="poupanca-movimento-voltar"
              onClick={() => setVisao("lista")}
            >
              {dict.operacao.cancelar}
            </button>
          </form>
        </div>

        {passo === "confirmar" && (
          <ConfirmarPinOverlay
            titulo={dict.operacao.confirmarTitulo}
            linhas={[
              { label: dict.poupancas.poupanca, valor: poupancaAtual?.iban ?? "" },
              {
                label: visao === "depositar" ? dict.poupancas.contaOrigem : dict.poupancas.contaDestino,
                valor: contaAtual?.iban ?? "",
              },
              { label: dict.poupancas.valor, valor: formatarEuro(Number(valor)) },
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
            labelPin={dict.poupancas.pin}
            testIdPrefix="poupanca-movimento"
          />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <h2>{dict.poupancas.titulo}</h2>

      <div className="card card-form">
        <button type="button" data-testid="poupancas-criar" onClick={handleCriar} disabled={aCriar}>
          {aCriar ? dict.poupancas.aCriar : dict.poupancas.criar}
        </button>
        {mensagemCriacao && (
          <p className={mensagemCriacao.tipo === "erro" ? "erro" : "sucesso"} data-testid="poupancas-criar-mensagem">
            {mensagemCriacao.texto}
          </p>
        )}
      </div>

      {poupancas.length === 0 ? (
        <div className="card">
          <p data-testid="poupancas-sem-poupancas">{dict.poupancas.semPoupancas}</p>
        </div>
      ) : (
        poupancas.map((p) => (
          <div className="card conta-card" key={p.id} data-testid={`poupanca-${p.id}`}>
            <div className="conta-header">
              <div>
                <p className="conta-tipo">{dict.contas.contaPoupanca}</p>
                <p className="conta-iban" data-testid="poupanca-iban">
                  {p.iban}
                </p>
              </div>
              <p className="conta-saldo" data-testid="poupanca-saldo">
                {formatarEuro(p.saldo)}
              </p>
            </div>

            <div className="poupanca-acoes">
              <button type="button" data-testid="poupanca-adicionar" onClick={() => abrirMovimento("depositar", p.id)}>
                {dict.poupancas.adicionarDinheiro}
              </button>
              <button
                type="button"
                data-testid="poupanca-levantar"
                onClick={() => abrirMovimento("levantar", p.id)}
                disabled={p.saldo <= 0}
              >
                {dict.poupancas.levantarDinheiro}
              </button>
              <button
                type="button"
                className="button-secundario"
                data-testid="poupanca-excluir"
                onClick={() => {
                  setPoupancaExcluirId(p.id);
                  setPinExcluir("");
                  setErroExcluir(null);
                }}
              >
                {dict.poupancas.excluir}
              </button>
            </div>

            {poupancaExcluirId === p.id && (
              <form className="poupanca-excluir-form" onSubmit={handleExcluir}>
                <p className="erro">{dict.poupancas.excluirAviso}</p>
                <label htmlFor={`excluirPin${p.id}`}>{dict.poupancas.pin}</label>
                <input
                  id={`excluirPin${p.id}`}
                  data-testid="poupanca-excluir-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinExcluir}
                  onChange={(e) => setPinExcluir(e.target.value)}
                  required
                />

                {erroExcluir && (
                  <p className="erro" data-testid="poupanca-excluir-mensagem">
                    {erroExcluir}
                  </p>
                )}

                <div className="overlay-acoes">
                  <button
                    type="button"
                    className="button-secundario"
                    data-testid="poupanca-excluir-cancelar"
                    onClick={() => setPoupancaExcluirId(null)}
                    disabled={aExcluir}
                  >
                    {dict.operacao.cancelar}
                  </button>
                  <button type="submit" data-testid="poupanca-excluir-confirmar" disabled={aExcluir}>
                    {aExcluir ? dict.poupancas.aExcluir : dict.poupancas.excluirConfirmar}
                  </button>
                </div>
              </form>
            )}
          </div>
        ))
      )}
    </div>
  );
}
