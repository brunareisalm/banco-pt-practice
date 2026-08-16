import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIdioma } from "../i18n/IdiomaContext";

export default function Registo() {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [username, setUsername] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);
  const { registo } = useAuth();
  const navigate = useNavigate();
  const { dict } = useIdioma();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (password !== confirmar) {
      setErro(dict.registo.passwordsDiferentes);
      return;
    }

    setACarregar(true);
    try {
      await registo({ username, password, nomeCompleto, telefone });
      navigate("/inicio");
    } catch (err) {
      if (err instanceof Error && err.message === "username_existente") {
        setErro(dict.registo.usernameExistente);
      } else {
        setErro(dict.registo.erroGenerico);
      }
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div className="page page-centered">
      <div className="card card-form">
        <h1 className="logo">🏦 BancoPT Practice</h1>
        <p className="subtitle">{dict.registo.titulo}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="nomeCompleto">{dict.registo.nomeCompleto}</label>
          <input
            id="nomeCompleto"
            data-testid="registo-nome"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            required
          />

          <label htmlFor="username">{dict.registo.username}</label>
          <input
            id="username"
            data-testid="registo-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="telefone">{dict.registo.telefone}</label>
          <input
            id="telefone"
            data-testid="registo-telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
          />

          <label htmlFor="password">{dict.registo.password}</label>
          <input
            id="password"
            data-testid="registo-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label htmlFor="confirmar">{dict.registo.confirmarPassword}</label>
          <input
            id="confirmar"
            data-testid="registo-confirmar"
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />

          {erro && (
            <p className="erro" data-testid="registo-erro">
              {erro}
            </p>
          )}

          <button type="submit" data-testid="registo-submit" disabled={aCarregar}>
            {aCarregar ? dict.registo.aCriar : dict.registo.registar}
          </button>
        </form>

        <p>
          {dict.registo.jaTemConta} <Link to="/login">{dict.registo.entrar}</Link>
        </p>
      </div>
    </div>
  );
}
