import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';

test.describe('BancoPT Practice - Navegação', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/inicio$/);

    // Estes testes partem todos da lista de contas — o login agora aterra
    // na página inicial (dashboard), por isso navegamos para lá explicitamente.
    await page.getByTestId('nav-contas').click();
    await expect(page).toHaveURL(/\/contas$/);
  });

  test('deve abrir a área de Transferências a partir do menu', async ({ page }) => {
    await page.getByTestId('nav-transferencia').click();

    await expect(page).toHaveURL(/\/transferencia$/);
    await expect(page.getByRole('heading', { name: 'Nova transferência' })).toBeVisible();
    await expect(page.getByTestId('transferencia-origem')).toBeVisible();
    await expect(page.getByTestId('transferencia-iban')).toBeVisible();
    await expect(page.getByTestId('transferencia-valor')).toBeVisible();
    await expect(page.getByTestId('transferencia-continuar')).toBeVisible();
  });

  test('deve abrir Saldos e Movimentos de uma conta a partir da lista de contas', async ({ page }) => {
    await page.getByRole('link', { name: 'Saldos e Movimentos →' }).first().click();

    await expect(page).toHaveURL(/\/consultas\/saldos-e-movimentos\?conta=.+/);
    await expect(page.getByRole('heading', { name: 'Saldos e Movimentos' })).toBeVisible();
    await expect(page.getByTestId('saldos-movimentos-tabela')).toBeVisible();
    await expect(page.getByTestId('saldos-movimentos-tabela')).toContainText('Salário');
    await expect(page.getByTestId('saldos-movimentos-tabela')).toContainText('Renda');
  });

  test('deve terminar sessão e voltar ao login', async ({ page }) => {
    await page.getByTestId('logout-button').click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-username')).toBeVisible();

    // Depois de sair, as rotas privadas voltam a exigir autenticação.
    await page.goto('/contas');
    await expect(page).toHaveURL(/\/login$/);
  });
});
