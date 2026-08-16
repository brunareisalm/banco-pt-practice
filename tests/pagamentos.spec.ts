import { test, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';
const DEMO_PIN = '1234';

function parseEuro(texto: string): number {
  const match = texto.match(/([\d.]+,\d{2})\s?€/);
  if (!match) throw new Error(`Não encontrei um valor em euros em "${texto}"`);
  return Number(match[1].replace(/\./g, '').replace(',', '.'));
}

async function saldoAtual(page: Page): Promise<number> {
  const texto = await page.getByTestId('pagamento-conta').locator('option:checked').innerText();
  return parseEuro(texto);
}

async function preencherDados(
  page: Page,
  data: { entidade: string; referencia: string; valor: string }
) {
  await page.getByTestId('pagamento-entidade').fill(data.entidade);
  await page.getByTestId('pagamento-referencia').fill(data.referencia);
  await page.getByTestId('pagamento-valor').fill(data.valor);
  await page.getByTestId('pagamento-continuar').click();
}

test.describe('BancoPT Practice - Pagamentos de Serviços', () => {
  // Todos os testes debitam a mesma conta demo partilhada — corrida em série
  // evita que o teste do valor exato seja afetado por outro pagamento a
  // decorrer em paralelo no mesmo saldo.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
    // "Pagamentos" passou a ser um menu com submenus — abre-o e escolhe
    // "Pagamento de Serviços ou Compras" para chegar ao ecrã de sempre.
    await page.getByTestId('nav-pagamentos').click();
    await page.getByTestId('nav-pagamentos-servicos').click();
    await expect(page).toHaveURL(/\/pagamentos$/);
  });

  test('deve apresentar o formulário de dados (passo 1)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Pagamento de Serviços' })).toBeVisible();
    await expect(page.getByTestId('pagamento-entidade')).toBeVisible();
    await expect(page.getByTestId('pagamento-referencia')).toBeVisible();
    await expect(page.getByTestId('pagamento-valor')).toBeVisible();
    await expect(page.getByTestId('pagamento-continuar')).toBeVisible();
    await expect(page.getByTestId('pagamento-pin')).toBeHidden();
  });

  test('deve mostrar o overlay de confirmação com o resumo antes de pedir o PIN', async ({ page }) => {
    await preencherDados(page, { entidade: '12345', referencia: '123456789', valor: '25.50' });

    await expect(page.getByTestId('pagamento-overlay')).toBeVisible();
    await expect(page.getByTestId('pagamento-overlay')).toContainText('12345');
    await expect(page.getByTestId('pagamento-overlay')).toContainText('123456789');
    await expect(page.getByTestId('pagamento-overlay')).toContainText('25,50 €');
    await expect(page.getByTestId('pagamento-pin')).toBeVisible();
  });

  test('deve permitir cancelar a confirmação e voltar ao formulário', async ({ page }) => {
    await preencherDados(page, { entidade: '54321', referencia: '987654321', valor: '3' });
    await expect(page.getByTestId('pagamento-overlay')).toBeVisible();

    await page.getByTestId('pagamento-cancelar').click();

    await expect(page.getByTestId('pagamento-overlay')).toBeHidden();
    await expect(page.getByTestId('pagamento-entidade')).toHaveValue('54321');
  });

  test('deve efetuar um pagamento com sucesso e mostrar o resumo final', async ({ page }) => {
    const saldoAntes = await saldoAtual(page);

    await preencherDados(page, { entidade: '12345', referencia: '123456789', valor: '25.50' });
    await page.getByTestId('pagamento-pin').fill(DEMO_PIN);
    await page.getByTestId('pagamento-confirmar').click();

    await expect(page.getByTestId('pagamento-resumo')).toBeVisible();
    await expect(page.getByTestId('pagamento-resumo-estado')).toContainText('Concluída');
    await expect(page.getByTestId('pagamento-resumo')).toContainText('12345');
    await expect(page.getByTestId('pagamento-resumo')).toContainText('123456789');
    await expect(page.getByTestId('pagamento-resumo')).toContainText('25,50 €');
    await expect(page.getByTestId('pagamento-resumo-data')).toHaveText(/\d{2}\/\d{2}\/\d{4}/);

    await page.getByTestId('pagamento-nova-operacao').click();
    await expect(page.getByTestId('pagamento-entidade')).toHaveValue('');
    // "Nova operação" volta a pedir as contas ao servidor; esperamos o saldo
    // mostrado deixar de ser o antigo antes de o lermos.
    await expect.poll(() => saldoAtual(page)).not.toBe(saldoAntes);
    const saldoDepois = await saldoAtual(page);
    expect(Math.round((saldoAntes - saldoDepois) * 100) / 100).toBe(25.5);
  });

  test('deve rejeitar uma entidade inválida (diferente de 5 dígitos)', async ({ page }) => {
    await preencherDados(page, { entidade: '123', referencia: '123456789', valor: '10' });
    await page.getByTestId('pagamento-pin').fill(DEMO_PIN);
    await page.getByTestId('pagamento-confirmar').click();

    await expect(page.getByTestId('pagamento-mensagem')).toHaveText('Entidade inválida — deve ter 5 dígitos.');
  });

  test('deve rejeitar uma referência inválida (diferente de 9 dígitos)', async ({ page }) => {
    await preencherDados(page, { entidade: '12345', referencia: '123', valor: '10' });
    await page.getByTestId('pagamento-pin').fill(DEMO_PIN);
    await page.getByTestId('pagamento-confirmar').click();

    await expect(page.getByTestId('pagamento-mensagem')).toHaveText('Referência inválida — deve ter 9 dígitos.');
  });

  test('deve rejeitar um PIN incorreto e permitir tentar novamente', async ({ page }) => {
    await preencherDados(page, { entidade: '12345', referencia: '123456789', valor: '10' });

    await page.getByTestId('pagamento-pin').fill('0000');
    await page.getByTestId('pagamento-confirmar').click();
    await expect(page.getByTestId('pagamento-mensagem')).toHaveText('PIN incorreto.');

    await page.getByTestId('pagamento-pin').fill(DEMO_PIN);
    await page.getByTestId('pagamento-confirmar').click();
    await expect(page.getByTestId('pagamento-resumo')).toBeVisible();
  });

  test('deve bloquear um valor igual a zero e não avançar para a confirmação', async ({ page }) => {
    const valorInput = page.getByTestId('pagamento-valor');
    await page.getByTestId('pagamento-entidade').fill('12345');
    await page.getByTestId('pagamento-referencia').fill('123456789');
    await valorInput.fill('0');
    await page.getByTestId('pagamento-continuar').click();

    await expect(page.getByTestId('pagamento-overlay')).toBeHidden();
    const isValid = await valorInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('deve rejeitar um pagamento acima do saldo disponível', async ({ page }) => {
    await preencherDados(page, { entidade: '12345', referencia: '999999999', valor: '999999' });
    await page.getByTestId('pagamento-pin').fill(DEMO_PIN);
    await page.getByTestId('pagamento-confirmar').click();

    await expect(page.getByTestId('pagamento-mensagem')).toHaveText('Saldo insuficiente para este pagamento.');
  });
});
