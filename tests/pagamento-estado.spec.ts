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

async function login(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
  // Espera o redireciono para /inicio antes de qualquer page.goto() a seguir:
  // um goto() imediato pode cancelar o POST de login ainda em curso (perdendo
  // o token) porque provoca uma navegação completa da página.
  await expect(page).toHaveURL(/\/inicio$/);
}

async function saldoOrigem(page: Page, testIdSelect: string): Promise<number> {
  const texto = await page.getByTestId(testIdSelect).locator('option:checked').innerText();
  return parseEuro(texto);
}

test.describe('BancoPT Practice - Pagamento ao Estado e Setor Público', () => {
  // Todos os testes debitam a mesma conta demo partilhada.
  test.describe.configure({ mode: 'serial' });

  test.describe('Pagamento ao Estado', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/pagamentos/estado');
    });

    test('deve apresentar o formulário de dados (passo 1)', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Pagamento ao Estado' })).toBeVisible();
      await expect(page.getByTestId('pagamento-estado-referencia')).toBeVisible();
      await expect(page.getByTestId('pagamento-estado-valor')).toBeVisible();
      await expect(page.getByTestId('pagamento-estado-pin')).toBeHidden();
    });

    test('deve rejeitar uma referência inválida', async ({ page }) => {
      await page.getByTestId('pagamento-estado-referencia').fill('123');
      await page.getByTestId('pagamento-estado-valor').fill('10');
      await page.getByTestId('pagamento-estado-continuar').click();
      await page.getByTestId('pagamento-estado-pin').fill(DEMO_PIN);
      await page.getByTestId('pagamento-estado-confirmar').click();

      await expect(page.getByTestId('pagamento-estado-mensagem')).toHaveText(
        'Referência inválida — deve ter 9 dígitos.'
      );
    });

    test('deve efetuar o pagamento com sucesso e debitar o valor exato', async ({ page }) => {
      const saldoAntes = await saldoOrigem(page, 'pagamento-estado-conta');

      await page.getByTestId('pagamento-estado-referencia').fill('111222333');
      await page.getByTestId('pagamento-estado-valor').fill('42.10');
      await page.getByTestId('pagamento-estado-continuar').click();
      await page.getByTestId('pagamento-estado-pin').fill(DEMO_PIN);
      await page.getByTestId('pagamento-estado-confirmar').click();

      await expect(page.getByTestId('pagamento-estado-resumo-estado')).toContainText('Concluída');

      await page.getByTestId('pagamento-estado-nova-operacao').click();
      await expect.poll(() => saldoOrigem(page, 'pagamento-estado-conta')).not.toBe(saldoAntes);
      const saldoDepois = await saldoOrigem(page, 'pagamento-estado-conta');
      expect(Math.round((saldoAntes - saldoDepois) * 100) / 100).toBe(42.1);
    });
  });

  test.describe('Pagamento da Segurança Social', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/pagamentos/seguranca-social');
    });

    test('deve rejeitar um NISS inválido', async ({ page }) => {
      await page.getByTestId('pagamento-seguranca-social-niss').fill('123');
      await page.getByTestId('pagamento-seguranca-social-periodo').fill('07/2026');
      await page.getByTestId('pagamento-seguranca-social-valor').fill('50');
      await page.getByTestId('pagamento-seguranca-social-continuar').click();
      await page.getByTestId('pagamento-seguranca-social-pin').fill(DEMO_PIN);
      await page.getByTestId('pagamento-seguranca-social-confirmar').click();

      await expect(page.getByTestId('pagamento-seguranca-social-mensagem')).toHaveText(
        'NISS inválido — deve ter 11 dígitos.'
      );
    });

    test('deve rejeitar um período inválido', async ({ page }) => {
      await page.getByTestId('pagamento-seguranca-social-niss').fill('12345678901');
      await page.getByTestId('pagamento-seguranca-social-periodo').fill('2026/07');
      await page.getByTestId('pagamento-seguranca-social-valor').fill('50');
      await page.getByTestId('pagamento-seguranca-social-continuar').click();
      await page.getByTestId('pagamento-seguranca-social-pin').fill(DEMO_PIN);
      await page.getByTestId('pagamento-seguranca-social-confirmar').click();

      await expect(page.getByTestId('pagamento-seguranca-social-mensagem')).toHaveText(
        'Período inválido — usa o formato MM/AAAA.'
      );
    });

    test('deve efetuar o pagamento com sucesso', async ({ page }) => {
      await page.getByTestId('pagamento-seguranca-social-niss').fill('12345678901');
      await page.getByTestId('pagamento-seguranca-social-periodo').fill('07/2026');
      await page.getByTestId('pagamento-seguranca-social-valor').fill('60');
      await page.getByTestId('pagamento-seguranca-social-continuar').click();
      await page.getByTestId('pagamento-seguranca-social-pin').fill(DEMO_PIN);
      await page.getByTestId('pagamento-seguranca-social-confirmar').click();

      await expect(page.getByTestId('pagamento-seguranca-social-resumo-estado')).toContainText('Concluída');
      await expect(page.getByTestId('pagamento-seguranca-social-resumo')).toContainText('12345678901');
    });
  });

  test.describe('Pagamento da TSU', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/pagamentos/tsu');
    });

    test('deve apresentar o formulário e efetuar o pagamento com sucesso', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Pagamento da TSU' })).toBeVisible();

      await page.getByTestId('pagamento-tsu-niss').fill('98765432100');
      await page.getByTestId('pagamento-tsu-periodo').fill('07/2026');
      await page.getByTestId('pagamento-tsu-valor').fill('25');
      await page.getByTestId('pagamento-tsu-continuar').click();
      await page.getByTestId('pagamento-tsu-pin').fill(DEMO_PIN);
      await page.getByTestId('pagamento-tsu-confirmar').click();

      await expect(page.getByTestId('pagamento-tsu-resumo-estado')).toContainText('Concluída');
    });

    test('deve rejeitar um PIN incorreto', async ({ page }) => {
      await page.getByTestId('pagamento-tsu-niss').fill('98765432100');
      await page.getByTestId('pagamento-tsu-periodo').fill('07/2026');
      await page.getByTestId('pagamento-tsu-valor').fill('25');
      await page.getByTestId('pagamento-tsu-continuar').click();
      await page.getByTestId('pagamento-tsu-pin').fill('0000');
      await page.getByTestId('pagamento-tsu-confirmar').click();

      await expect(page.getByTestId('pagamento-tsu-mensagem')).toHaveText('PIN incorreto.');
    });
  });
});
