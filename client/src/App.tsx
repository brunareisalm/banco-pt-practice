import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { IdiomaProvider } from "./i18n/IdiomaContext";
import Login from "./pages/Login";
import Registo from "./pages/Registo";
import Layout from "./pages/Layout";
import Inicio from "./pages/Inicio";
import Contas from "./pages/Contas";
import Transferencia from "./pages/Transferencia";
import Pagamentos from "./pages/Pagamentos";
import PagamentoEstado from "./pages/PagamentoEstado";
import PagamentoSocial from "./pages/PagamentoSocial";
import { api } from "./api";
import MBWay from "./pages/MBWay";
import Cartoes from "./pages/Cartoes";
import PagarCartaoCredito from "./pages/PagarCartaoCredito";
import AumentoLimite from "./pages/AumentoLimite";
import MovimentosCartaoCredito from "./pages/MovimentosCartaoCredito";
import PedidoCartaoCredito from "./pages/PedidoCartaoCredito";
import AtivacaoCartaoCredito from "./pages/AtivacaoCartaoCredito";
import CancelarCartaoCredito from "./pages/CancelarCartaoCredito";
import Extratos from "./pages/Extratos";
import NibIbanSwift from "./pages/NibIbanSwift";
import OperacoesAgendadas from "./pages/OperacoesAgendadas";
import SaldosMovimentos from "./pages/SaldosMovimentos";
import Carregamentos from "./pages/Carregamentos";
import Poupancas from "./pages/Poupancas";
import Definicoes from "./pages/Definicoes";

function RotaPrivada({ children }: { children: React.ReactElement }) {
  const { authenticated } = useAuth();
  return authenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registo" element={<Registo />} />

      <Route
        element={
          <RotaPrivada>
            <Layout />
          </RotaPrivada>
        }
      >
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/contas" element={<Contas />} />
        <Route path="/transferencia" element={<Transferencia />} />
        <Route path="/pagamentos" element={<Pagamentos />} />
        <Route path="/pagamentos/estado" element={<PagamentoEstado />} />
        <Route
          path="/pagamentos/seguranca-social"
          element={
            <PagamentoSocial
              dictKey="pagamentoSegurancaSocial"
              apiFn={api.pagarSegurancaSocial}
              testIdPrefix="pagamento-seguranca-social"
            />
          }
        />
        <Route
          path="/pagamentos/tsu"
          element={<PagamentoSocial dictKey="pagamentoTSU" apiFn={api.pagarTSU} testIdPrefix="pagamento-tsu" />}
        />
        <Route path="/consultas/saldos-e-movimentos" element={<SaldosMovimentos />} />
        <Route path="/consultas/extratos" element={<Extratos />} />
        <Route path="/consultas/nib-iban-swift" element={<NibIbanSwift />} />
        <Route path="/consultas/operacoes-agendadas" element={<OperacoesAgendadas />} />
        <Route path="/mbway" element={<MBWay />} />
        <Route path="/carregamentos" element={<Carregamentos />} />
        <Route path="/cartoes" element={<Cartoes />} />
        <Route path="/cartoes/pagar-credito" element={<PagarCartaoCredito />} />
        <Route path="/cartoes/aumento-limite" element={<AumentoLimite />} />
        <Route path="/cartoes/movimentos-credito" element={<MovimentosCartaoCredito />} />
        <Route path="/cartoes/pedido-credito" element={<PedidoCartaoCredito />} />
        <Route path="/cartoes/ativacao-credito" element={<AtivacaoCartaoCredito />} />
        <Route path="/cartoes/cancelar-credito" element={<CancelarCartaoCredito />} />
        <Route path="/poupancas" element={<Poupancas />} />
        <Route path="/definicoes" element={<Definicoes />} />
      </Route>

      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <IdiomaProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </IdiomaProvider>
  );
}
