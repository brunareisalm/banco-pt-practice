import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';

test.describe('BancoPT Practice - Autenticação', () => {
  test('deve apresentar o formulário de login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('deve autenticar com sucesso usando a conta de demonstração', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);

    await expect(page).toHaveURL(/\/inicio$/);
    await expect(page.getByRole('heading', { name: 'Olá, Utilizador Demo' })).toBeVisible();
    await expect(page.getByTestId('user-nome')).toHaveText('Utilizador Demo');
    await expect(page.getByTestId('nav-contas')).toBeVisible();
    await expect(page.getByTestId('nav-transferencia')).toBeVisible();
    // Não fixamos o valor exato do saldo: a base de dados em memória do
    // servidor acumula estado entre reinícios/sessões de teste anteriores.
    await expect(page.getByTestId('saldo-total')).toContainText('€');
  });

  test('deve rejeitar credenciais inválidas com mensagem de erro', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(DEMO_USERNAME, 'palavra-chave-errada');

    await expect(loginPage.errorMessage).toHaveText('Username ou password inválidos.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('deve bloquear a submissão com campos vazios (validação HTML5)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.submitButton.click();

    // O campo "required" impede o pedido de sequer ser enviado ao servidor.
    await expect(page).toHaveURL(/\/login$/);
    const isValid = await loginPage.usernameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });
});
