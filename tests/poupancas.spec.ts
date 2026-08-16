import { test, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';
const DEMO_PIN = '1234';

async function login(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
  // Espera o redireciono para /inicio antes de qualquer page.goto() a seguir:
  // um goto() imediato pode cancelar o POST de login ainda em curso (perdendo
  // o token) porque provoca uma navegação completa da página.
  await expect(page).toHaveURL(/\/inicio$/);
}

/** Cria uma poupança nova (saldo sempre a zero) e devolve o cartão dela — a mais recente da lista. */
async function criarPoupancaEDevolverCartao(page: Page) {
  await page.goto('/poupancas');
  await page.getByTestId('poupancas-criar').click();
  await expect(page.getByTestId('poupancas-criar-mensagem')).toBeVisible();
  return page.locator('.conta-card').last();
}

async function depositar(page: Page, valor: string) {
  await page.getByTestId('poupanca-movimento-valor').fill(valor);
  await page.getByTestId('poupanca-movimento-continuar').click();
  await page.getByTestId('poupanca-movimento-pin').fill(DEMO_PIN);
  await page.getByTestId('poupanca-movimento-confirmar').click();
  await expect(page.getByTestId('poupanca-movimento-resumo')).toBeVisible();
  await page.getByTestId('poupanca-movimento-nova-operacao').click();
}

test.describe('BancoPT Practice - Poupanças', () => {
  // Os testes partilham as poupanças da conta demo — corrida em série evita
  // que dois testes criem/excluam poupanças ao mesmo tempo e se atrapalhem.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve aparecer no menu como link direto, sem submenus', async ({ page }) => {
    await expect(page.getByTestId('nav-poupancas')).toBeVisible();
    await page.getByTestId('nav-poupancas').click();
    await expect(page).toHaveURL(/\/poupancas$/);
    await expect(page.getByRole('heading', { name: 'Poupanças' })).toBeVisible();
  });

  test('deve distinguir Conta à Ordem de Conta Poupança na página de Contas', async ({ page }) => {
    await criarPoupancaEDevolverCartao(page);
    await page.goto('/contas');
    await expect(page.getByText('Conta Poupança').first()).toBeVisible();
    await expect(page.getByText('Conta à Ordem').first()).toBeVisible();
  });

  test('deve criar uma conta poupança com sucesso e com saldo a zero', async ({ page }) => {
    const cartao = await criarPoupancaEDevolverCartao(page);
    await expect(cartao.getByTestId('poupanca-saldo')).toHaveText('0,00 €');
    await expect(cartao.getByTestId('poupanca-levantar')).toBeDisabled();
  });

  test('deve adicionar dinheiro a uma poupança e refletir no saldo', async ({ page }) => {
    const cartao = await criarPoupancaEDevolverCartao(page);
    await cartao.getByTestId('poupanca-adicionar').click();

    await depositar(page, '75');

    await expect(page.locator('.conta-card').last().getByTestId('poupanca-saldo')).toHaveText('75,00 €');
  });

  test('deve rejeitar um PIN incorreto ao adicionar dinheiro', async ({ page }) => {
    const cartao = await criarPoupancaEDevolverCartao(page);
    await cartao.getByTestId('poupanca-adicionar').click();

    await page.getByTestId('poupanca-movimento-valor').fill('10');
    await page.getByTestId('poupanca-movimento-continuar').click();
    await page.getByTestId('poupanca-movimento-pin').fill('0000');
    await page.getByTestId('poupanca-movimento-confirmar').click();

    await expect(page.getByTestId('poupanca-movimento-mensagem')).toHaveText('PIN incorreto.');
  });

  test('deve levantar dinheiro de uma poupança e refletir no saldo', async ({ page }) => {
    const cartao = await criarPoupancaEDevolverCartao(page);
    await cartao.getByTestId('poupanca-adicionar').click();
    await depositar(page, '50');

    const cartaoAtualizado = page.locator('.conta-card').last();
    await cartaoAtualizado.getByTestId('poupanca-levantar').click();
    await depositar(page, '20'); // mesmo fluxo de 3 passos, agora do lado do levantamento

    await expect(page.locator('.conta-card').last().getByTestId('poupanca-saldo')).toHaveText('30,00 €');
  });

  test('deve rejeitar um levantamento acima do saldo disponível', async ({ page }) => {
    const cartao = await criarPoupancaEDevolverCartao(page);
    await cartao.getByTestId('poupanca-adicionar').click();
    await depositar(page, '10');

    const cartaoAtualizado = page.locator('.conta-card').last();
    await cartaoAtualizado.getByTestId('poupanca-levantar').click();

    await page.getByTestId('poupanca-movimento-valor').fill('999999');
    await page.getByTestId('poupanca-movimento-continuar').click();
    await page.getByTestId('poupanca-movimento-pin').fill(DEMO_PIN);
    await page.getByTestId('poupanca-movimento-confirmar').click();

    await expect(page.getByTestId('poupanca-movimento-mensagem')).toHaveText('Saldo insuficiente para esta operação.');
  });

  test('deve rejeitar a exclusão de uma poupança com saldo diferente de zero', async ({ page }) => {
    const cartao = await criarPoupancaEDevolverCartao(page);
    await cartao.getByTestId('poupanca-adicionar').click();
    await depositar(page, '15');

    const cartaoAtualizado = page.locator('.conta-card').last();
    await cartaoAtualizado.getByTestId('poupanca-excluir').click();
    await cartaoAtualizado.getByTestId('poupanca-excluir-pin').fill(DEMO_PIN);
    await cartaoAtualizado.getByTestId('poupanca-excluir-confirmar').click();

    await expect(cartaoAtualizado.getByTestId('poupanca-excluir-mensagem')).toHaveText(
      'Só podes excluir uma poupança com saldo em zero.'
    );
  });

  test('deve rejeitar a exclusão com um PIN incorreto', async ({ page }) => {
    const cartao = await criarPoupancaEDevolverCartao(page);
    await cartao.getByTestId('poupanca-excluir').click();
    await cartao.getByTestId('poupanca-excluir-pin').fill('0000');
    await cartao.getByTestId('poupanca-excluir-confirmar').click();

    await expect(cartao.getByTestId('poupanca-excluir-mensagem')).toHaveText('PIN incorreto.');
  });

  test('deve excluir com sucesso uma poupança com saldo zero', async ({ page }) => {
    const cartao = await criarPoupancaEDevolverCartao(page);
    const iban = await cartao.getByTestId('poupanca-iban').innerText();

    await cartao.getByTestId('poupanca-excluir').click();
    await cartao.getByTestId('poupanca-excluir-pin').fill(DEMO_PIN);
    await cartao.getByTestId('poupanca-excluir-confirmar').click();

    await expect(page.getByText(iban)).toHaveCount(0);
  });
});
