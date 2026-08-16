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
});
