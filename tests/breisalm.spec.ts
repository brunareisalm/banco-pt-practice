import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const USERNAME = 'breisalm';
const PASSWORD = 'br163264';

async function login(page: import('@playwright/test').Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(USERNAME, PASSWORD);
  // Espera o redireciono para /inicio antes de qualquer page.goto() a seguir:
  // um goto() imediato pode cancelar o POST de login ainda em curso (perdendo
  // o token) porque provoca uma navegação completa da página.
  await expect(page).toHaveURL(/\/inicio$/);
}

test.describe('BancoPT Practice - Utilizador breisalm', () => {
  test('deve autenticar com sucesso e mostrar 3 contas à ordem e 3 poupanças', async ({ page }) => {
    await login(page);
    await page.goto('/contas');

    await expect(page.getByText('Conta à Ordem')).toHaveCount(3);
    await expect(page.getByText('Conta Poupança')).toHaveCount(3);
  });

  test('deve ter 3 cartões de débito e 3 de crédito', async ({ page }) => {
    await login(page);
    await page.goto('/cartoes');

    await expect(page.getByText('Cartão de Débito')).toHaveCount(3);
    await expect(page.getByText('Cartão de Crédito')).toHaveCount(3);
  });
});
