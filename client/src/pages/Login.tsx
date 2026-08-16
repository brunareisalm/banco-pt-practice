import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIdioma } from "../i18n/IdiomaContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { dict } = useIdioma();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setACarregar(true);
    try {
      await login(username, password);
      navigate("/inicio");
    } catch (err) {
      setErro(
        err instanceof Error && err.message === "credenciais_invalidas"
          ? dict.login.erroCredenciais
          : dict.login.erroGenerico
      );
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div className="page page-centered">
      <div className="card card-form">
        <h1 className="logo">🏦 BancoPT Practice</h1>
        <p className="subtitle">{dict.login.titulo}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">{dict.login.username}</label>
          <input
            id="username"
            data-testid="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="password">{dict.login.password}</label>
          <input
            id="password"
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {erro && (
            <p className="erro" data-testid="login-erro">
              {erro}
            </p>
          )}

          <button type="submit" data-testid="login-submit" disabled={aCarregar}>
            {aCarregar ? dict.login.aEntrar : dict.login.entrar}
          </button>
        </form>

        <p className="hint">
          {dict.login.contaDemo} <code>demo</code> / <code>demo123</code>
        </p>

        <p>
          {dict.login.semConta} <Link to="/registo">{dict.login.registarAqui}</Link>
        </p>
      </div>
    </div>
  );
}
