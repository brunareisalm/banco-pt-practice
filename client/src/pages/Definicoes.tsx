import { type FormEvent, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useIdioma } from "../i18n/IdiomaContext";
import type { Idioma } from "../i18n/translations";

export default function Definicoes() {
  const { idioma, setIdioma, dict } = useIdioma();
  const { user, atualizarNome } = useAuth();

  const [nomeCompleto, setNomeCompleto] = useState(user?.nomeCompleto ?? "");
  const [mensagemNome, setMensagemNome] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [aGuardarNome, setAGuardarNome] = useState(false);

  const [passwordAtual, setPasswordAtual] = useState("");
  const [passwordNova, setPasswordNova] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [mensagemPassword, setMensagemPassword] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(
    null
  );
  const [aGuardarPassword, setAGuardarPassword] = useState(false);

  const [pinAtual, setPinAtual] = useState("");
  const [pinNovo, setPinNovo] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [mensagemPin, setMensagemPin] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [aGuardarPin, setAGuardarPin] = useState(false);

  function selecionarIdioma(novoIdioma: Idioma) {
    setIdioma(novoIdioma);
  }

  async function handleSubmitNome(e: FormEvent) {
    e.preventDefault();
    setMensagemNome(null);
    setAGuardarNome(true);
    try {
      const resultado = await api.alterarNome({ nomeCompleto });
      atualizarNome(resultado.nomeCompleto);
      setNomeCompleto(resultado.nomeCompleto);
      setMensagemNome({ tipo: "sucesso", texto: dict.definicoes.nomeSucesso });
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        conta_demo_nome_protegido: dict.definicoes.nomeContaDemoProtegida,
        nome_invalido: dict.definicoes.nomeInvalido,
      };
      setMensagemNome({ tipo: "erro", texto: mensagens[codigo] || dict.definicoes.erroGenerico });
    } finally {
      setAGuardarNome(false);
    }
  }

  async function handleSubmitPassword(e: FormEvent) {
    e.preventDefault();
    setMensagemPassword(null);
    setAGuardarPassword(true);
    try {
      await api.alterarPassword({
        passwordAtual,
        passwordNova,
        confirmarPasswordNova: passwordConfirmar,
      });
      setMensagemPassword({ tipo: "sucesso", texto: dict.definicoes.passwordSucesso });
      setPasswordAtual("");
      setPasswordNova("");
      setPasswordConfirmar("");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        conta_demo_protegida: dict.definicoes.contaDemoProtegida,
        password_atual_invalida: dict.definicoes.passwordAtualInvalida,
        password_nova_invalida: dict.definicoes.passwordNovaInvalida,
        passwords_nao_coincidem: dict.definicoes.passwordsNaoCoincidem,
      };
      setMensagemPassword({ tipo: "erro", texto: mensagens[codigo] || dict.definicoes.erroGenerico });
    } finally {
      setAGuardarPassword(false);
    }
  }

  async function handleSubmitPin(e: FormEvent) {
    e.preventDefault();
    setMensagemPin(null);
    setAGuardarPin(true);
    try {
      await api.alterarPin({ pinAtual, pinNovo, confirmarPinNovo: pinConfirmar });
      setMensagemPin({ tipo: "sucesso", texto: dict.definicoes.sucesso });
      setPinAtual("");
      setPinNovo("");
      setPinConfirmar("");
    } catch (err) {
      const codigo = err instanceof Error ? err.message : "erro_desconhecido";
      const mensagens: Record<string, string> = {
        pin_atual_invalido: dict.definicoes.pinAtualInvalido,
        pin_novo_invalido: dict.definicoes.pinNovoInvalido,
        pins_nao_coincidem: dict.definicoes.pinsNaoCoincidem,
      };
      setMensagemPin({ tipo: "erro", texto: mensagens[codigo] || dict.definicoes.erroGenerico });
    } finally {
      setAGuardarPin(false);
    }
  }

  return (
    <div className="page">
      <h2>{dict.definicoes.titulo}</h2>

      <div className="card card-form">
        <h3>{dict.definicoes.idioma}</h3>
        <div className="idioma-opcoes">
          <button
            type="button"
            data-testid="definicoes-idioma-pt"
            className={idioma === "pt" ? "idioma-opcao idioma-opcao-ativa" : "idioma-opcao"}
            onClick={() => selecionarIdioma("pt")}
          >
            🇵🇹 {dict.definicoes.portugues}
          </button>
          <button
            type="button"
            data-testid="definicoes-idioma-en"
            className={idioma === "en" ? "idioma-opcao idioma-opcao-ativa" : "idioma-opcao"}
            onClick={() => selecionarIdioma("en")}
          >
            🇬🇧 {dict.definicoes.ingles}
          </button>
        </div>
      </div>

      <div className="card card-form">
        <h3>{dict.definicoes.alterarNome}</h3>
        <form onSubmit={handleSubmitNome}>
          <label htmlFor="nomeCompletoInput">{dict.definicoes.novoNome}</label>
          <input
            id="nomeCompletoInput"
            data-testid="definicoes-nome-input"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            maxLength={80}
            required
          />

          {mensagemNome && (
            <p
              className={mensagemNome.tipo === "erro" ? "erro" : "sucesso"}
              data-testid="definicoes-nome-mensagem"
            >
              {mensagemNome.texto}
            </p>
          )}

          <button type="submit" data-testid="definicoes-nome-submit" disabled={aGuardarNome}>
            {aGuardarNome ? dict.definicoes.aGuardar : dict.definicoes.guardar}
          </button>
        </form>
      </div>

      <div className="card card-form">
        <h3>{dict.definicoes.alterarPassword}</h3>
        <form onSubmit={handleSubmitPassword}>
          <label htmlFor="passwordAtual">{dict.definicoes.passwordAtual}</label>
          <input
            id="passwordAtual"
            data-testid="definicoes-password-atual"
            type="password"
            value={passwordAtual}
            onChange={(e) => setPasswordAtual(e.target.value)}
            required
          />

          <label htmlFor="passwordNova">{dict.definicoes.passwordNova}</label>
          <input
            id="passwordNova"
            data-testid="definicoes-password-nova"
            type="password"
            value={passwordNova}
            onChange={(e) => setPasswordNova(e.target.value)}
            required
          />

          <label htmlFor="passwordConfirmar">{dict.definicoes.passwordConfirmar}</label>
          <input
            id="passwordConfirmar"
            data-testid="definicoes-password-confirmar"
            type="password"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            required
          />

          {mensagemPassword && (
            <p
              className={mensagemPassword.tipo === "erro" ? "erro" : "sucesso"}
              data-testid="definicoes-password-mensagem"
            >
              {mensagemPassword.texto}
            </p>
          )}

          <button type="submit" data-testid="definicoes-password-submit" disabled={aGuardarPassword}>
            {aGuardarPassword ? dict.definicoes.aGuardar : dict.definicoes.guardar}
          </button>
        </form>
      </div>

      <div className="card card-form">
        <h3>{dict.definicoes.alterarPin}</h3>
        <p className="hint">{dict.definicoes.pinExplicacao}</p>
        <form onSubmit={handleSubmitPin}>
          <label htmlFor="pinAtual">{dict.definicoes.pinAtual}</label>
          <input
            id="pinAtual"
            data-testid="definicoes-pin-atual"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinAtual}
            onChange={(e) => setPinAtual(e.target.value)}
            required
          />

          <label htmlFor="pinNovo">{dict.definicoes.pinNovo}</label>
          <input
            id="pinNovo"
            data-testid="definicoes-pin-novo"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinNovo}
            onChange={(e) => setPinNovo(e.target.value)}
            required
          />

          <label htmlFor="pinConfirmar">{dict.definicoes.pinConfirmar}</label>
          <input
            id="pinConfirmar"
            data-testid="definicoes-pin-confirmar"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinConfirmar}
            onChange={(e) => setPinConfirmar(e.target.value)}
            required
          />

          {mensagemPin && (
            <p
              className={mensagemPin.tipo === "erro" ? "erro" : "sucesso"}
              data-testid="definicoes-pin-mensagem"
            >
              {mensagemPin.texto}
            </p>
          )}

          <button type="submit" data-testid="definicoes-pin-submit" disabled={aGuardarPin}>
            {aGuardarPin ? dict.definicoes.aGuardar : dict.definicoes.guardar}
          </button>
        </form>
      </div>
    </div>
  );
}
