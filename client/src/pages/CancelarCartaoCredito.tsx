import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Cartao } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

export default function CancelarCartaoCredito() {
  const { dict } = useIdioma();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [cartaoId, setCartaoId] = useState("");
  const [pin, setPin] = useState("");
  const [aCarregar, setACarregar] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [aCancelar, setACancelar] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function carregar() {
    api.listarCartoes().then(({ cartoes: todos }) => {
      const elegiveis = todos.filter(
        (c) => c.tipo === "CREDITO" && (c.estado === "ATIVO" || c.estado === "BLOQUEADO")
      );
      setCartoes(elegiveis);
      setCartaoId(elegiveis[0]?.id || "");
      setACarregar(false);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMensagem(null);
    setACancelar(true);
    try {
      await api.cancelarCartaoCredito(cartaoId, { pin });
      setMensagem({ tipo: "sucesso", texto: dict.cartaoCancelar.sucesso });
      setPin("");
      carregar();
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        saldo_devedor_pendente: dict.cartaoCancelar.saldoDevedorPendente,
        cartao_invalido: dict.cartaoCancelar.cartaoInvalido,
        pin_invalido: dict.cartaoCancelar.pinInvalido,
      };
      setMensagem({ tipo: "erro", texto: mensagens[codigo] || dict.cartaoCancelar.erroGenerico });
      setPin("");
    } finally {
      setACancelar(false);
    }
  }

  if (aCarregar) return <p>{dict.cartoes.aCarregar}</p>;

  return (
    <div className="page">
      <h2>{dict.cartaoCancelar.titulo}</h2>

      {cartoes.length === 0 ? (
        <div className="card">
          <p>{dict.cartaoCancelar.semCartoes}</p>
        </div>
      ) : (
        <div className="card card-form">
          <form onSubmit={handleSubmit}>
            <label htmlFor="cartaoCancelar">{dict.cartaoCancelar.cartao}</label>
            <select
              id="cartaoCancelar"
              data-testid="cancelar-cartao-cartao"
              value={cartaoId}
              onChange={(e) => setCartaoId(e.target.value)}
            >
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numeroMascarado}
                </option>
              ))}
            </select>

            <p className="erro" data-testid="cancelar-cartao-aviso">
              {dict.cartaoCancelar.aviso}
            </p>

            <label htmlFor="pinCancelar">{dict.cartaoCancelar.pin}</label>
            <input
              id="pinCancelar"
              data-testid="cancelar-cartao-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />

            {mensagem && (
              <p className={mensagem.tipo === "erro" ? "erro" : "sucesso"} data-testid="cancelar-cartao-mensagem">
                {mensagem.texto}
              </p>
            )}

            <button type="submit" data-testid="cancelar-cartao-submit" disabled={aCancelar}>
              {aCancelar ? dict.cartaoCancelar.aCancelar : dict.cartaoCancelar.cancelar}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
