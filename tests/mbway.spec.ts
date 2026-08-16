import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { MBWayPage } from './pages/MBWayPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';
const DEMO_PIN = '1234';
const API_URL = 'http://localhost:4001';

test.describe('BancoPT Practice - MB WAY', () => {
  // A ativação da carteira é uma ação por-utilizador que persiste enquanto o
  // servidor não reiniciar — corrida em série evita que um teste mude o
  // número enquanto outro está a meio de um pagamento.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
    // Espera o redireciono para /inicio antes de qualquer page.goto() a seguir:
    // um goto() imediato pode cancelar o POST de login ainda em curso (perdendo
    // o token) porque provoca uma navegação completa da página.
    await expect(page).toHaveURL(/\/inicio$/);
    const mbway = new MBWayPage(page);
    await mbway.goto();
  });

  test('deve rejeitar um número de telemóvel inválido', async ({ page }) => {
    const mbway = new MBWayPage(page);
    await mbway.ativar('212345678'); // não começa em 9

    await expect(mbway.ativarErro).toHaveText(
      'Número inválido — indica um telemóvel português (9 dígitos, começado em 9).'
    );
  });

  test('deve ativar/mudar o número associado com sucesso', async ({ page }) => {
    const mbway = new MBWayPage(page);
    await mbway.ativar('935555555');

    await expect(mbway.estado).toContainText('935555555');
    await expect(mbway.mudarNumeroButton).toBeVisible();
  });

  test('deve efetuar um pagamento MB WAY com sucesso e debitar o valor exato', async ({ page }) => {
    const mbway = new MBWayPage(page);
    await mbway.garantirAtivo('935555555');

    const saldoAntes = await mbway.saldoConta();
    await mbway.pagar('12.34', DEMO_PIN);

    await expect(mbway.mensagem).toHaveText('Transferência MB WAY efetuada com sucesso.');
    // A mensagem de sucesso aparece antes do refetch de contas terminar — espera
    // o saldo mudar antes de o ler, tal como nos outros fluxos desta suite.
    await expect.poll(() => mbway.saldoConta()).not.toBe(saldoAntes);
    const saldoDepois = await mbway.saldoConta();
    expect(Math.round((saldoAntes - saldoDepois) * 100) / 100).toBe(12.34);
  });

  test('deve rejeitar um pagamento acima do saldo disponível', async ({ page }) => {
    const mbway = new MBWayPage(page);
    await mbway.garantirAtivo('935555555');

    // Não fixamos qual conta nem o seu saldo (os valores da seed podem mudar) —
    // um valor deliberadamente enorme garante saldo insuficiente em qualquer conta.
    await mbway.pagar('999999', DEMO_PIN);

    await expect(mbway.mensagem).toHaveText('Saldo insuficiente para esta transferência.');
  });

  test('deve rejeitar um PIN incorreto', async ({ page }) => {
    const mbway = new MBWayPage(page);
    await mbway.garantirAtivo('935555555');

    await mbway.pagar('5', '0000');

    await expect(mbway.mensagem).toHaveText('PIN incorreto.');
  });

  test('deve rejeitar um número de telemóvel de destino inválido', async ({ page }) => {
    const mbway = new MBWayPage(page);
    await mbway.garantirAtivo('935555555');

    await mbway.pagar('5', DEMO_PIN, '212345678'); // não começa em 9

    await expect(mbway.mensagem).toHaveText(
      'Número inválido — indica um telemóvel português (9 dígitos, começado em 9).'
    );
  });

  test('deve rejeitar um pagamento quando a carteira não está ativa (via API)', async ({ request }) => {
    // A conta demo já fica com a carteira MB WAY ativa a partir dos testes
    // anteriores, por isso este cenário só é reprodutível registando um
    // utilizador novo diretamente pela API — sem passar pela UI.
    const registo = await request.post(`${API_URL}/api/auth/registo`, {
      data: {
        username: `teste_mbway_${Date.now()}`,
        password: 'senha123',
        nomeCompleto: 'Utilizador Sem Carteira',
        telefone: '910000001',
      },
    });
    expect(registo.status()).toBe(201);
    const { token, conta } = await registo.json();

    const pagamento = await request.post(`${API_URL}/api/mbway/pagamentos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { contaId: conta.id, valor: 10 },
    });

    expect(pagamento.status()).toBe(400);
    const body = await pagamento.json();
    expect(body.error).toBe('carteira_nao_ativa');
  });
});
