import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CartoesPage } from './pages/CartoesPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';

// IDs determinísticos gerados pelo seed() do servidor (cartao_1 = débito,
// cartao_2 = crédito), confirmados ao vivo antes de escrever este ficheiro.
const CARTAO_DEBITO = 'cartao_1';
const CARTAO_CREDITO = 'cartao_2';

test.describe('BancoPT Practice - Cartões', () => {
  // O estado (ativo/bloqueado) dos cartões é partilhado pelo utilizador
  // demo — corrida em série evita que dois testes alternem o mesmo cartão
  // em simultâneo.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
    // Espera o redireciono para /inicio antes de qualquer page.goto() a seguir:
    // um goto() imediato pode cancelar o POST de login ainda em curso (perdendo
    // o token) porque provoca uma navegação completa da página.
    await expect(page).toHaveURL(/\/inicio$/);
    const cartoesPage = new CartoesPage(page);
    await cartoesPage.goto();
  });

  test('deve listar o cartão de débito e o cartão de crédito', async ({ page }) => {
    const cartoesPage = new CartoesPage(page);

    await expect(cartoesPage.cartao(CARTAO_DEBITO)).toContainText('Cartão de Débito');
    await expect(cartoesPage.cartao(CARTAO_DEBITO)).toContainText('•••• •••• •••• 1001');

    await expect(cartoesPage.cartao(CARTAO_CREDITO)).toContainText('Cartão de Crédito');
    await expect(cartoesPage.cartao(CARTAO_CREDITO)).toContainText('•••• •••• •••• 1002');
    // Não fixamos o valor exato do limite: os testes de Aumento de Limite
    // (noutro ficheiro) alteram-no ao longo da suite.
    await expect(cartoesPage.cartao(CARTAO_CREDITO).getByTestId('cartao-limite')).toContainText('€');
  });

  test('deve bloquear e desbloquear o cartão de débito', async ({ page }) => {
    const cartoesPage = new CartoesPage(page);
    await cartoesPage.garantirEstado(CARTAO_DEBITO, 'ATIVO');

    await cartoesPage.toggleButton(CARTAO_DEBITO).click();
    await expect(cartoesPage.estado(CARTAO_DEBITO)).toHaveText('Bloqueado');
    await expect(cartoesPage.toggleButton(CARTAO_DEBITO)).toHaveText('Desbloquear cartão');

    await cartoesPage.toggleButton(CARTAO_DEBITO).click();
    await expect(cartoesPage.estado(CARTAO_DEBITO)).toHaveText('Ativo');
    await expect(cartoesPage.toggleButton(CARTAO_DEBITO)).toHaveText('Bloquear cartão');
  });

  test('bloquear um cartão não deve afetar o estado do outro', async ({ page }) => {
    const cartoesPage = new CartoesPage(page);
    await cartoesPage.garantirEstado(CARTAO_DEBITO, 'ATIVO');
    await cartoesPage.garantirEstado(CARTAO_CREDITO, 'ATIVO');

    await cartoesPage.toggleButton(CARTAO_DEBITO).click();

    await expect(cartoesPage.estado(CARTAO_DEBITO)).toHaveText('Bloqueado');
    await expect(cartoesPage.estado(CARTAO_CREDITO)).toHaveText('Ativo');

    // repõe o estado para não afetar outros testes que corram a seguir
    await cartoesPage.garantirEstado(CARTAO_DEBITO, 'ATIVO');
  });

  test.describe('Ver dados completos', () => {
    test('deve rejeitar um PIN incorreto', async ({ page }) => {
      const cartoesPage = new CartoesPage(page);
      await cartoesPage.verDadosButton(CARTAO_DEBITO).click();

      const cartao = cartoesPage.cartao(CARTAO_DEBITO);
      await cartao.getByTestId('cartao-dados-pin').fill('0000');
      await cartao.getByTestId('cartao-dados-confirmar').click();

      await expect(cartao.getByTestId('cartao-dados-mensagem')).toHaveText('PIN incorreto.');
      await expect(cartao.getByTestId('cartao-dados-revelados')).toBeHidden();
    });

    test('deve mostrar número completo, validade e código de segurança com o PIN correto', async ({ page }) => {
      const cartoesPage = new CartoesPage(page);
      const cartao = cartoesPage.cartao(CARTAO_DEBITO);
      await cartoesPage.verDadosButton(CARTAO_DEBITO).click();

      await cartao.getByTestId('cartao-dados-pin').fill('1234');
      await cartao.getByTestId('cartao-dados-confirmar').click();

      await expect(cartao.getByTestId('cartao-dados-numero')).toHaveText(/^\d{4} \d{4} \d{4} 1001$/);
      await expect(cartao.getByTestId('cartao-dados-validade')).toHaveText('12/29');
      await expect(cartao.getByTestId('cartao-dados-cvv')).toHaveText(/^\d{3}$/);

      // Esconder volta a mostrar só o botão, sem os dados.
      await cartao.getByTestId('cartao-dados-ocultar').click();
      await expect(cartao.getByTestId('cartao-dados-revelados')).toBeHidden();
      await expect(cartoesPage.verDadosButton(CARTAO_DEBITO)).toBeVisible();
    });
  });

  test('a listagem geral de cartões não deve expor o número completo nem o CVV', async ({ page, request }) => {
    const loginResp = await request.post('http://localhost:4001/api/auth/login', {
      data: { username: DEMO_USERNAME, password: DEMO_PASSWORD },
    });
    const { token } = await loginResp.json();

    const cartoesResp = await request.get('http://localhost:4001/api/cartoes', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { cartoes } = await cartoesResp.json();

    for (const cartao of cartoes) {
      expect(cartao).not.toHaveProperty('numeroCompleto');
      expect(cartao).not.toHaveProperty('cvv');
    }
  });
});
