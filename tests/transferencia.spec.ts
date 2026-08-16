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

async function contaOrigemAtual(page: Page): Promise<{ iban: string; saldo: number }> {
  const texto = await page.getByTestId('transferencia-origem').locator('option:checked').innerText();
  const [iban] = texto.split('—').map((parte) => parte.trim());
  return { iban, saldo: parseEuro(texto) };
}

async function preencherDados(
  page: Page,
  data: { iban: string; valor: string; descricao?: string }
) {
  await page.getByTestId('transferencia-iban').fill(data.iban);
  await page.getByTestId('transferencia-valor').fill(data.valor);
  if (data.descricao) await page.getByTestId('transferencia-descricao').fill(data.descricao);
  await page.getByTestId('transferencia-continuar').click();
}

test.describe('BancoPT Practice - Transferências', () => {
  // Todos os testes debitam a mesma conta demo partilhada — corrida em série
  // evita interferência entre o teste do valor exato e os restantes.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
    await page.getByTestId('nav-transferencia').click();
    await expect(page).toHaveURL(/\/transferencia$/);
  });

  test('deve apresentar o formulário de dados (passo 1)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Nova transferência' })).toBeVisible();
    await expect(page.getByTestId('transferencia-iban')).toBeVisible();
    await expect(page.getByTestId('transferencia-valor')).toBeVisible();
    await expect(page.getByTestId('transferencia-continuar')).toBeVisible();
    // O PIN só aparece no passo de confirmação, não no formulário de dados.
    await expect(page.getByTestId('transferencia-pin')).toBeHidden();
  });

  test('deve mostrar o overlay de confirmação com o resumo antes de pedir o PIN', async ({ page }) => {
    const { iban: ibanOrigem } = await contaOrigemAtual(page);
    await preencherDados(page, { iban: 'PT50999999999999999999900', valor: '12' });

    await expect(page.getByTestId('transferencia-overlay')).toBeVisible();
    await expect(page.getByTestId('transferencia-overlay')).toContainText(ibanOrigem);
    await expect(page.getByTestId('transferencia-overlay')).toContainText('PT50999999999999999999900');
    await expect(page.getByTestId('transferencia-overlay')).toContainText('12,00 €');
    await expect(page.getByTestId('transferencia-pin')).toBeVisible();
  });

  test('deve permitir cancelar a confirmação e voltar ao formulário', async ({ page }) => {
    await preencherDados(page, { iban: 'PT50999999999999999999901', valor: '9' });
    await expect(page.getByTestId('transferencia-overlay')).toBeVisible();

    await page.getByTestId('transferencia-cancelar').click();

    await expect(page.getByTestId('transferencia-overlay')).toBeHidden();
    await expect(page.getByTestId('transferencia-iban')).toHaveValue('PT50999999999999999999901');
  });

  test('deve efetuar uma transferência com sucesso e mostrar o resumo final', async ({ page }) => {
    const { saldo: saldoAntes } = await contaOrigemAtual(page);

    await preencherDados(page, {
      iban: 'PT50999999999999999999902',
      valor: '15.75',
      descricao: 'Teste de resumo',
    });
    await page.getByTestId('transferencia-pin').fill(DEMO_PIN);
    await page.getByTestId('transferencia-confirmar').click();

    await expect(page.getByTestId('transferencia-resumo')).toBeVisible();
    await expect(page.getByTestId('transferencia-resumo-estado')).toContainText('Concluída');
    await expect(page.getByTestId('transferencia-resumo')).toContainText('PT50999999999999999999902');
    await expect(page.getByTestId('transferencia-resumo')).toContainText('15,75 €');
    await expect(page.getByTestId('transferencia-resumo')).toContainText('Teste de resumo');
    // Data e hora no formato pt-PT, ex.: "16/08/2026, 03:11:57".
    await expect(page.getByTestId('transferencia-resumo-data')).toHaveText(/\d{2}\/\d{2}\/\d{4}/);

    await page.getByTestId('transferencia-nova-operacao').click();
    await expect(page.getByTestId('transferencia-iban')).toHaveValue('');
    // "Nova operação" volta a pedir as contas ao servidor; esperamos o saldo
    // mostrado deixar de ser o antigo antes de o lermos.
    await expect.poll(async () => (await contaOrigemAtual(page)).saldo).not.toBe(saldoAntes);
    const { saldo: saldoDepois } = await contaOrigemAtual(page);
    expect(Math.round((saldoAntes - saldoDepois) * 100) / 100).toBe(15.75);
  });

  test('deve rejeitar uma transferência para a mesma conta', async ({ page }) => {
    const { iban } = await contaOrigemAtual(page);
    await preencherDados(page, { iban, valor: '5' });

    await page.getByTestId('transferencia-pin').fill(DEMO_PIN);
    await page.getByTestId('transferencia-confirmar').click();

    await expect(page.getByTestId('transferencia-mensagem')).toHaveText('Não podes transferir para a mesma conta.');
    // O overlay mantém-se aberto para o utilizador poder corrigir.
    await expect(page.getByTestId('transferencia-overlay')).toBeVisible();
  });

  test('deve rejeitar uma transferência acima do saldo disponível', async ({ page }) => {
    await preencherDados(page, { iban: 'PT50999999999999999999903', valor: '999999' });

    await page.getByTestId('transferencia-pin').fill(DEMO_PIN);
    await page.getByTestId('transferencia-confirmar').click();

    await expect(page.getByTestId('transferencia-mensagem')).toHaveText('Saldo insuficiente para esta transferência.');
  });

  test('deve rejeitar um PIN incorreto e permitir tentar novamente', async ({ page }) => {
    await preencherDados(page, { iban: 'PT50999999999999999999904', valor: '5' });

    await page.getByTestId('transferencia-pin').fill('0000');
    await page.getByTestId('transferencia-confirmar').click();
    await expect(page.getByTestId('transferencia-mensagem')).toHaveText('PIN incorreto.');

    // Tenta novamente com o PIN correto, sem sair do overlay.
    await page.getByTestId('transferencia-pin').fill(DEMO_PIN);
    await page.getByTestId('transferencia-confirmar').click();
    await expect(page.getByTestId('transferencia-resumo')).toBeVisible();
  });

  test('deve bloquear um valor igual a zero e não avançar para a confirmação', async ({ page }) => {
    const valorInput = page.getByTestId('transferencia-valor');
    await page.getByTestId('transferencia-iban').fill('PT50999999999999999999905');
    await valorInput.fill('0');
    await page.getByTestId('transferencia-continuar').click();

    await expect(page.getByTestId('transferencia-overlay')).toBeHidden();
    const isValid = await valorInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });
});
