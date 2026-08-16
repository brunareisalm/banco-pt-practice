import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useIdioma } from "../i18n/IdiomaContext";

type MenuAberto = "pagamentos" | "consultas" | "cartoes" | null;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { dict } = useIdioma();
  const [menuAberto, setMenuAberto] = useState<MenuAberto>(null);
  const [grupoEstadoAberto, setGrupoEstadoAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function alternarMenu(menu: MenuAberto) {
    setMenuAberto((atual) => (atual === menu ? null : menu));
    setGrupoEstadoAberto(false);
  }

  function fecharMenus() {
    setMenuAberto(null);
    setGrupoEstadoAberto(false);
    setMenuMobileAberto(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="logo-small">🏦 BancoPT Practice</span>
        <button
          type="button"
          className="menu-hamburguer"
          data-testid="nav-menu-mobile-toggle"
          aria-label={dict.nav.abrirMenu}
          onClick={() => setMenuMobileAberto((atual) => !atual)}
        >
          {menuMobileAberto ? "✕" : "☰"}
        </button>
        <nav className={menuMobileAberto ? "topnav topnav--aberto" : "topnav"}>
          <NavLink to="/inicio" data-testid="nav-inicio" onClick={fecharMenus}>
            {dict.nav.inicio}
          </NavLink>
          <NavLink to="/contas" data-testid="nav-contas" onClick={fecharMenus}>
            {dict.nav.contas}
          </NavLink>
          <NavLink to="/transferencia" data-testid="nav-transferencia" onClick={fecharMenus}>
            {dict.nav.transferir}
          </NavLink>

          <div className="nav-dropdown">
            <button
              type="button"
              className="nav-dropdown-trigger"
              data-testid="nav-pagamentos"
              onClick={() => alternarMenu("pagamentos")}
            >
              {dict.nav.pagamentos} {menuAberto === "pagamentos" ? "▴" : "▾"}
            </button>
            {menuAberto === "pagamentos" && (
              <div className="nav-dropdown-menu" data-testid="nav-pagamentos-menu">
                <Link to="/pagamentos" data-testid="nav-pagamentos-servicos" onClick={fecharMenus}>
                  {dict.nav.pagamentosServicos}
                </Link>
                <button
                  type="button"
                  className="nav-dropdown-subtrigger"
                  data-testid="nav-pagamentos-estado-grupo"
                  onClick={() => setGrupoEstadoAberto((atual) => !atual)}
                >
                  {dict.nav.pagamentosEstadoGrupo} {grupoEstadoAberto ? "▴" : "▾"}
                </button>
                {grupoEstadoAberto && (
                  <div className="nav-dropdown-submenu" data-testid="nav-pagamentos-estado-menu">
                    <Link to="/pagamentos/estado" data-testid="nav-pagamentos-estado" onClick={fecharMenus}>
                      {dict.nav.pagamentoEstado}
                    </Link>
                    <Link
                      to="/pagamentos/seguranca-social"
                      data-testid="nav-pagamentos-seguranca-social"
                      onClick={fecharMenus}
                    >
                      {dict.nav.pagamentoSegurancaSocial}
                    </Link>
                    <Link to="/pagamentos/tsu" data-testid="nav-pagamentos-tsu" onClick={fecharMenus}>
                      {dict.nav.pagamentoTSU}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="nav-dropdown">
            <button
              type="button"
              className="nav-dropdown-trigger"
              data-testid="nav-consultas"
              onClick={() => alternarMenu("consultas")}
            >
              {dict.nav.consultas} {menuAberto === "consultas" ? "▴" : "▾"}
            </button>
            {menuAberto === "consultas" && (
              <div className="nav-dropdown-menu nav-dropdown-menu--right" data-testid="nav-consultas-menu">
                <Link
                  to="/consultas/saldos-e-movimentos"
                  data-testid="nav-consultas-saldos"
                  onClick={fecharMenus}
                >
                  {dict.nav.consultasSaldos}
                </Link>
                <Link to="/consultas/extratos" data-testid="nav-consultas-extratos" onClick={fecharMenus}>
                  {dict.nav.consultasExtratos}
                </Link>
                <Link
                  to="/consultas/nib-iban-swift"
                  data-testid="nav-consultas-nib-iban-swift"
                  onClick={fecharMenus}
                >
                  {dict.nav.consultasNibIbanSwift}
                </Link>
                <Link
                  to="/consultas/operacoes-agendadas"
                  data-testid="nav-consultas-agendadas"
                  onClick={fecharMenus}
                >
                  {dict.nav.consultasAgendadas}
                </Link>
              </div>
            )}
          </div>

          <NavLink to="/carregamentos" data-testid="nav-carregamentos" onClick={fecharMenus}>
            {dict.nav.carregamentos}
          </NavLink>

          <div className="nav-dropdown">
            <button
              type="button"
              className="nav-dropdown-trigger"
              data-testid="nav-cartoes"
              onClick={() => alternarMenu("cartoes")}
            >
              {dict.nav.cartoes} {menuAberto === "cartoes" ? "▴" : "▾"}
            </button>
            {menuAberto === "cartoes" && (
              <div className="nav-dropdown-menu nav-dropdown-menu--right" data-testid="nav-cartoes-menu">
                <Link to="/cartoes" data-testid="nav-cartoes-dados" onClick={fecharMenus}>
                  {dict.nav.cartoesDados}
                </Link>
                <Link to="/mbway" data-testid="nav-cartoes-mbway" onClick={fecharMenus}>
                  {dict.nav.mbway}
                </Link>
                <Link
                  to="/cartoes/pagar-credito"
                  data-testid="nav-cartoes-pagar-credito"
                  onClick={fecharMenus}
                >
                  {dict.nav.cartoesPagarCredito}
                </Link>
                <Link
                  to="/cartoes/aumento-limite"
                  data-testid="nav-cartoes-aumento-limite"
                  onClick={fecharMenus}
                >
                  {dict.nav.cartoesAumentoLimite}
                </Link>
                <Link
                  to="/cartoes/movimentos-credito"
                  data-testid="nav-cartoes-movimentos-credito"
                  onClick={fecharMenus}
                >
                  {dict.nav.cartoesMovimentosCredito}
                </Link>
                <Link
                  to="/cartoes/pedido-credito"
                  data-testid="nav-cartoes-pedido-credito"
                  onClick={fecharMenus}
                >
                  {dict.nav.cartoesPedidoCredito}
                </Link>
                <Link
                  to="/cartoes/ativacao-credito"
                  data-testid="nav-cartoes-ativacao-credito"
                  onClick={fecharMenus}
                >
                  {dict.nav.cartoesAtivacaoCredito}
                </Link>
                <Link
                  to="/cartoes/cancelar-credito"
                  data-testid="nav-cartoes-cancelar-credito"
                  onClick={fecharMenus}
                >
                  {dict.nav.cartoesCancelarCredito}
                </Link>
              </div>
            )}
          </div>

          <NavLink to="/poupancas" data-testid="nav-poupancas" onClick={fecharMenus}>
            {dict.nav.poupancas}
          </NavLink>

          <NavLink to="/definicoes" data-testid="nav-definicoes" onClick={fecharMenus}>
            {dict.nav.definicoes}
          </NavLink>
        </nav>
        <div className="user-area">
          <span data-testid="user-nome">{user?.nomeCompleto}</span>
          <button onClick={handleLogout} data-testid="logout-button">
            {dict.nav.sair}
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
