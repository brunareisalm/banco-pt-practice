import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';

test.describe('BancoPT Practice - Página Inicial', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/inicio$/);
  });

  test('deve mostrar a saudação e o saldo total', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Olá, Utilizador Demo' })).toBeVisible();
    // Não fixamos o número exato de contas: os testes de Poupanças (noutro
    // ficheiro) criam contas poupança adicionais ao longo da suite.
    await expect(page.getByText(/Saldo total \(\d+ contas?\)/)).toBeVisible();
    await expect(page.getByTestId('saldo-total')).toContainText('€');
  });

  test('deve mostrar um acesso rápido para cada funcionalidade', async ({ page }) => {
    await expect(page.getByTestId('acesso-rapido-contas')).toBeVisible();
    await expect(page.getByTestId('acesso-rapido-transferencia')).toBeVisible();
    await expect(page.getByTestId('acesso-rapido-pagamentos')).toBeVisible();
    await expect(page.getByTestId('acesso-rapido-mbway')).toBeVisible();
    await expect(page.getByTestId('acesso-rapido-carregamentos')).toBeVisible();
    await expect(page.getByTestId('acesso-rapido-cartoes')).toBeVisible();
  });

  test('deve navegar para MB WAY a partir do acesso rápido', async ({ page }) => {
    await page.getByTestId('acesso-rapido-mbway').click();
    await expect(page).toHaveURL(/\/mbway$/);
  });

  test('deve navegar para Carregamentos a partir do acesso rápido', async ({ page }) => {
    await page.getByTestId('acesso-rapido-carregamentos').click();
    await expect(page).toHaveURL(/\/carregamentos$/);
  });

  test('deve navegar para Cartões a partir do acesso rápido', async ({ page }) => {
    await page.getByTestId('acesso-rapido-cartoes').click();
    await expect(page).toHaveURL(/\/cartoes$/);
  });

  test('deve voltar à página inicial a partir do menu "Início"', async ({ page }) => {
    await page.getByTestId('nav-contas').click();
    await expect(page).toHaveURL(/\/contas$/);

    await page.getByTestId('nav-inicio').click();
    await expect(page).toHaveURL(/\/inicio$/);
  });
});
