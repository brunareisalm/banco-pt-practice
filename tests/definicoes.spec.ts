import { test, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';
const API_URL = 'http://localhost:4001';

// Cada utilizador novo criado pela API começa sempre com PIN "0000" (ver
// criarUtilizador em server/src/db.ts) — usamos isto para testar a troca de
// PIN sem depender do PIN (mutável) da conta demo partilhada.
async function registarUtilizadorNovo(request: APIRequestContext) {
  const username = `teste_pin_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const response = await request.post(`${API_URL}/api/auth/registo`, {
    data: {
      username,
      password: 'senha123',
      nomeCompleto: 'Utilizador De Teste',
      telefone: '910000002',
    },
  });
  expect(response.status()).toBe(201);
  return { username, password: 'senha123' };
}

test.describe('BancoPT Practice - Definições', () => {
  test.describe('Idioma', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
      await page.getByTestId('nav-definicoes').click();
      await expect(page).toHaveURL(/\/definicoes$/);
    });

    test('deve mudar a interface toda para inglês e voltar para português', async ({ page }) => {
      await page.getByTestId('definicoes-idioma-en').click();

      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
      await expect(page.getByTestId('nav-inicio')).toHaveText('Home');
      // "Cartões" passou a ser um menu com submenus, por isso o texto do
      // botão inclui também a seta (ex.: "Cards ▾").
      await expect(page.getByTestId('nav-cartoes')).toContainText('Cards');
      await expect(page.getByTestId('logout-button')).toHaveText('Log out');

      await page.getByTestId('definicoes-idioma-pt').click();

      await expect(page.getByRole('heading', { name: 'Definições' })).toBeVisible();
      await expect(page.getByTestId('nav-inicio')).toHaveText('Início');
      await expect(page.getByTestId('nav-cartoes')).toContainText('Cartões');
      await expect(page.getByTestId('logout-button')).toHaveText('Sair');
    });

    test('a preferência de idioma deve manter-se ao navegar para outra página', async ({ page }) => {
      await page.getByTestId('definicoes-idioma-en').click();
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

      await page.getByTestId('nav-inicio').click();
      await expect(page).toHaveURL(/\/inicio$/);
      await expect(page.getByText(/^Hello,/)).toBeVisible();
    });
  });

  test.describe('Alterar Nome', () => {
    test('deve rejeitar a alteração do nome da conta demo', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-nome-input').fill('Outro Nome');
      await page.getByTestId('definicoes-nome-submit').click();

      await expect(page.getByTestId('definicoes-nome-mensagem')).toHaveText(
        'O nome da conta de demonstração não pode ser alterado.'
      );
      await expect(page.getByTestId('user-nome')).not.toHaveText('Outro Nome');
    });

    test('deve rejeitar um nome demasiado curto', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-nome-input').fill('A');
      await page.getByTestId('definicoes-nome-submit').click();

      await expect(page.getByTestId('definicoes-nome-mensagem')).toHaveText(
        'O nome deve ter entre 2 e 80 caracteres.'
      );
    });

    test('deve alterar o nome com sucesso e refletir no cabeçalho e na saudação inicial', async ({
      page,
      request,
    }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-nome-input').fill('Maria da Silva');
      await page.getByTestId('definicoes-nome-submit').click();

      await expect(page.getByTestId('definicoes-nome-mensagem')).toHaveText('Nome alterado com sucesso.');
      await expect(page.getByTestId('user-nome')).toHaveText('Maria da Silva');

      await page.getByTestId('nav-inicio').click();
      await expect(page.getByRole('heading', { name: 'Olá, Maria da Silva' })).toBeVisible();
    });
  });

  test.describe('Alterar Password', () => {
    test('deve rejeitar a alteração da password da conta demo', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-password-atual').fill(DEMO_PASSWORD);
      await page.getByTestId('definicoes-password-nova').fill('novaSenha123');
      await page.getByTestId('definicoes-password-confirmar').fill('novaSenha123');
      await page.getByTestId('definicoes-password-submit').click();

      await expect(page.getByTestId('definicoes-password-mensagem')).toHaveText(
        'A password da conta de demonstração não pode ser alterada.'
      );

      // Confirma que continua mesmo a dar para entrar com a password original.
      await page.getByTestId('logout-button').click();
      await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
      await expect(page).toHaveURL(/\/inicio$/);
    });

    test('deve rejeitar uma password atual incorreta', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-password-atual').fill('errada123');
      await page.getByTestId('definicoes-password-nova').fill('novaSenha123');
      await page.getByTestId('definicoes-password-confirmar').fill('novaSenha123');
      await page.getByTestId('definicoes-password-submit').click();

      await expect(page.getByTestId('definicoes-password-mensagem')).toHaveText('Password atual incorreta.');
    });

    test('deve rejeitar quando a confirmação não coincide com a nova password', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-password-atual').fill(password);
      await page.getByTestId('definicoes-password-nova').fill('novaSenha123');
      await page.getByTestId('definicoes-password-confirmar').fill('outraSenha456');
      await page.getByTestId('definicoes-password-submit').click();

      await expect(page.getByTestId('definicoes-password-mensagem')).toHaveText('As passwords não coincidem.');
    });

    test('deve rejeitar uma nova password demasiado curta', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-password-atual').fill(password);
      await page.getByTestId('definicoes-password-nova').fill('abc');
      await page.getByTestId('definicoes-password-confirmar').fill('abc');
      await page.getByTestId('definicoes-password-submit').click();

      await expect(page.getByTestId('definicoes-password-mensagem')).toHaveText(
        'A nova password deve ter pelo menos 6 caracteres.'
      );
    });

    test('deve alterar a password com sucesso e conseguir entrar com a nova password', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-password-atual').fill(password);
      await page.getByTestId('definicoes-password-nova').fill('novaSenha123');
      await page.getByTestId('definicoes-password-confirmar').fill('novaSenha123');
      await page.getByTestId('definicoes-password-submit').click();

      await expect(page.getByTestId('definicoes-password-mensagem')).toHaveText('Password alterada com sucesso.');

      await page.getByTestId('logout-button').click();
      await loginPage.login(username, 'novaSenha123');
      await expect(page).toHaveURL(/\/inicio$/);
    });
  });

  test.describe('Alterar PIN', () => {
    test('deve rejeitar um PIN atual incorreto', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-pin-atual').fill('9999');
      await page.getByTestId('definicoes-pin-novo').fill('5678');
      await page.getByTestId('definicoes-pin-confirmar').fill('5678');
      await page.getByTestId('definicoes-pin-submit').click();

      await expect(page.getByTestId('definicoes-pin-mensagem')).toHaveText('PIN atual incorreto.');
    });

    test('deve rejeitar quando a confirmação não coincide com o novo PIN', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-pin-atual').fill('0000');
      await page.getByTestId('definicoes-pin-novo').fill('5678');
      await page.getByTestId('definicoes-pin-confirmar').fill('5679');
      await page.getByTestId('definicoes-pin-submit').click();

      await expect(page.getByTestId('definicoes-pin-mensagem')).toHaveText('Os PINs não coincidem.');
    });

    test('deve rejeitar um novo PIN com um formato inválido', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-pin-atual').fill('0000');
      await page.getByTestId('definicoes-pin-novo').fill('12');
      await page.getByTestId('definicoes-pin-confirmar').fill('12');
      await page.getByTestId('definicoes-pin-submit').click();

      await expect(page.getByTestId('definicoes-pin-mensagem')).toHaveText('O novo PIN deve ter 4 dígitos.');
    });

    test('deve alterar o PIN com sucesso', async ({ page, request }) => {
      const { username, password } = await registarUtilizadorNovo(request);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.getByTestId('nav-definicoes').click();

      await page.getByTestId('definicoes-pin-atual').fill('0000');
      await page.getByTestId('definicoes-pin-novo').fill('5678');
      await page.getByTestId('definicoes-pin-confirmar').fill('5678');
      await page.getByTestId('definicoes-pin-submit').click();

      await expect(page.getByTestId('definicoes-pin-mensagem')).toHaveText('PIN alterado com sucesso.');

      // O PIN antigo deixa de ser válido depois da troca.
      await page.getByTestId('definicoes-pin-atual').fill('0000');
      await page.getByTestId('definicoes-pin-novo').fill('1111');
      await page.getByTestId('definicoes-pin-confirmar').fill('1111');
      await page.getByTestId('definicoes-pin-submit').click();
      await expect(page.getByTestId('definicoes-pin-mensagem')).toHaveText('PIN atual incorreto.');
    });
  });
});
