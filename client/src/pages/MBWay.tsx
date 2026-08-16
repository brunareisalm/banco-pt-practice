import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Conta } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

export default function MBWay() {
  const { dict } = useIdioma();
  const [ativo, setAtivo] = useState<boolean | null>(null);
  const [telefoneAtivo, setTelefoneAtivo] = useState<string | null>(null);
  const [telefone, setTelefone] = useState("");
  const [ativarErro, setAtivarErro] = useState<string | null>(null);
  const [aAtivar, setAAtivar] = useState(false);
  const [aEditarTelefone, setAEditarTelefone] = useState(false);

  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [numeroDestino, setNumeroDestino] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pin, setPin] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [aPagar, setAPagar] = useState(false);

  useEffect(() => {
    api.estadoMBWay().then(({ ativo, telefone }) => {
      setAtivo(ativo);
      setTelefoneAtivo(telefone);
    });
    api.listarContas().then(({ contas }) => {
      setContas(contas);
      if (contas[0]) setContaId(contas[0].id);
    });
  }, []);

  async function handleAtivar(e: FormEvent) {
    e.preventDefault();
    setAtivarErro(null);
    setAAtivar(true);
    try {
      const resultado = await api.ativarMBWay(telefone);
      setAtivo(resultado.ativo);
      setTelefoneAtivo(resultado.telefone);
      setAEditarTelefone(false);
      setTelefone("");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        telefone_invalido: dict.mbway.telefoneInvalido,
      };
      setAtivarErro(mensagens[codigo] || dict.mbway.erroAtivar);
    } finally {
      setAAtivar(false);
    }
  }

  async function handlePagar(e: FormEvent) {
    e.preventDefault();
    setMensagem(null);
    setAPagar(true);
    try {
      await api.pagarMBWay({ contaId, numeroDestino, valor: Number(valor), descricao: descricao || undefined, pin });
      setMensagem({ tipo: "sucesso", texto: dict.mbway.sucesso });
      setNumeroDestino("");
      setValor("");
      setDescricao("");
      setPin("");
      const { contas } = await api.listarContas();
      setContas(contas);
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_insuficiente: dict.mbway.saldoInsuficiente,
        valor_invalido: dict.mbway.valorInvalido,
        numero_destino_invalido: dict.mbway.numeroDestinoInvalido,
        carteira_nao_ativa: dict.mbway.carteiraNaoAtiva,
        conta_nao_encontrada: dict.mbway.contaInvalida,
        pin_invalido: dict.mbway.pinInvalido,
      };
      setMensagem({ tipo: "erro", texto: mensagens[codigo] || dict.mbway.erroGenerico });
    } finally {
      setAPagar(false);
    }
  }

  if (ativo === null) return <p>{dict.mbway.aCarregar}</p>;

  return (
    <div className="page">
      <h2>{dict.mbway.titulo}</h2>

      {(!ativo || aEditarTelefone) && (
        <div className="card card-form">
          <h3>{ativo ? dict.mbway.mudarTitulo : dict.mbway.ativarTitulo}</h3>
          <form onSubmit={handleAtivar}>
            <label htmlFor="telefoneMBWay">{dict.mbway.telefone}</label>
            <input
              id="telefoneMBWay"
              data-testid="mbway-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="912345678"
              maxLength={9}
              required
            />

            {ativarErro && (
              <p className="erro" data-testid="mbway-ativar-erro">
                {ativarErro}
              </p>
            )}

            <button type="submit" data-testid="mbway-ativar-submit" disabled={aAtivar}>
              {aAtivar ? dict.mbway.aGuardar : ativo ? dict.mbway.guardarNovoNumero : dict.mbway.ativar}
            </button>
          </form>
        </div>
      )}

      {ativo && !aEditarTelefone && (
        <>
          <p data-testid="mbway-estado" className="hint">
            {dict.mbway.carteiraAtiva} <strong>{telefoneAtivo}</strong>{" "}
            <button
              type="button"
              className="link-button"
              data-testid="mbway-mudar-numero"
              onClick={() => setAEditarTelefone(true)}
            >
              {dict.mbway.mudarNumero}
            </button>
          </p>

          <div className="card card-form">
            <h3>{dict.mbway.pagarTitulo}</h3>
            <form onSubmit={handlePagar}>
              <label htmlFor="contaMBWay">{dict.mbway.contaOrigem}</label>
              <select
                id="contaMBWay"
                data-testid="mbway-conta"
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
              >
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.iban} —{" "}
                    {conta.saldo.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                  </option>
                ))}
              </select>

              <label htmlFor="numeroDestinoMBWay">{dict.mbway.numeroDestino}</label>
              <input
                id="numeroDestinoMBWay"
                data-testid="mbway-numero-destino"
                value={numeroDestino}
                onChange={(e) => setNumeroDestino(e.target.value)}
                placeholder="912345678"
                maxLength={9}
                required
              />

              <label htmlFor="valorMBWay">{dict.mbway.valor}</label>
              <input
                id="valorMBWay"
                data-testid="mbway-valor"
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />

              <label htmlFor="descricaoMBWay">{dict.mbway.descricaoOpcional}</label>
              <input
                id="descricaoMBWay"
                data-testid="mbway-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />

              <label htmlFor="mbwayPin">{dict.mbway.pin}</label>
              <input
                id="mbwayPin"
                data-testid="mbway-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />

              {mensagem && (
                <p
                  className={mensagem.tipo === "erro" ? "erro" : "sucesso"}
                  data-testid="mbway-mensagem"
                >
                  {mensagem.texto}
                </p>
              )}

              <button type="submit" data-testid="mbway-submit" disabled={aPagar}>
                {aPagar ? dict.mbway.aPagar : dict.mbway.pagar}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
