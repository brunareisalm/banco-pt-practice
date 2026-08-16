import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Conta } from "../api";
import { useIdioma } from "../i18n/IdiomaContext";

function formatarEuro(valor: number): string {
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function PedidoCartaoCredito() {
  const { dict } = useIdioma();
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [limitePretendido, setLimitePretendido] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [aPedir, setAPedir] = useState(false);

  useEffect(() => {
    api.listarContas().then(({ contas }) => {
      setContas(contas);
      setContaId((atual) => atual || contas[0]?.id || "");
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMensagem(null);
    setAPedir(true);
    try {
      await api.pedirCartaoCredito({ contaId, limitePretendido: Number(limitePretendido) });
      setMensagem({ tipo: "sucesso", texto: dict.cartaoPedido.sucesso });
      setLimitePretendido("");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        limite_invalido: dict.cartaoPedido.limiteInvalido,
        limite_maximo: dict.cartaoPedido.limiteMaximo,
        conta_nao_encontrada: dict.cartaoPedido.contaInvalida,
      };
      setMensagem({ tipo: "erro", texto: mensagens[codigo] || dict.cartaoPedido.erroGenerico });
    } finally {
      setAPedir(false);
    }
  }

  return (
    <div className="page">
      <h2>{dict.cartaoPedido.titulo}</h2>
      <div className="card card-form">
        <form onSubmit={handleSubmit}>
          <label htmlFor="contaPedidoCartao">{dict.cartaoPedido.contaAssociada}</label>
          <select
            id="contaPedidoCartao"
            data-testid="pedido-cartao-conta"
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.iban} — {formatarEuro(c.saldo)}
              </option>
            ))}
          </select>

          <label htmlFor="limitePretendido">{dict.cartaoPedido.limitePretendido}</label>
          <input
            id="limitePretendido"
            data-testid="pedido-cartao-limite"
            type="number"
            step="0.01"
            min="0.01"
            value={limitePretendido}
            onChange={(e) => setLimitePretendido(e.target.value)}
            required
          />

          {mensagem && (
            <p className={mensagem.tipo === "erro" ? "erro" : "sucesso"} data-testid="pedido-cartao-mensagem">
              {mensagem.texto}
            </p>
          )}

          <button type="submit" data-testid="pedido-cartao-submit" disabled={aPedir}>
            {aPedir ? dict.cartaoPedido.aPedir : dict.cartaoPedido.pedir}
          </button>
        </form>
      </div>
    </div>
  );
}
