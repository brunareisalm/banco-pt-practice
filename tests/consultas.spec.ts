import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';

test.describe('BancoPT Practice - Consultas', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
    // Espera o redireciono para /inicio antes de qualquer page.goto() a seguir:
    // um goto() imediato pode cancelar o POST de login ainda em curso (perdendo
    // o token) porque provoca uma navegação completa da página.
    await expect(page).toHaveURL(/\/inicio$/);
  });

  test.describe('Saldos e Movimentos', () => {
    test('deve mostrar o saldo e os movimentos da primeira conta por omissão', async ({ page }) => {
      await page.goto('/consultas/saldos-e-movimentos');

      await expect(page.getByRole('heading', { name: 'Saldos e Movimentos' })).toBeVisible();
      await expect(page.getByTestId('saldos-movimentos-saldo')).toContainText('€');
      await expect(page.getByTestId('saldos-movimentos-tabela')).toContainText('Salário');
      await expect(page.getByText('Movimentos dos últimos 90 dias')).toBeVisible();
    });

    test('deve pré-selecionar a conta indicada no parâmetro ?conta= vindo da página de Contas', async ({ page }) => {
      // conta_2 é a "Conta Viagens" da seed — determinística, confirmada ao vivo.
      await page.goto('/consultas/saldos-e-movimentos?conta=conta_2');

      await expect(page.getByTestId('saldos-movimentos-conta')).toHaveValue('conta_2');
      await expect(page.getByTestId('saldos-movimentos-tabela')).toContainText('Depósito inicial');
    });

    test('deve mudar de conta através do seletor e atualizar o saldo apresentado', async ({ page }) => {
      await page.goto('/consultas/saldos-e-movimentos');

      const saldoAntes = await page.getByTestId('saldos-movimentos-saldo').innerText();
      await page.getByTestId('saldos-movimentos-conta').selectOption('conta_2');

      await expect.poll(() => page.getByTestId('saldos-movimentos-saldo').innerText()).not.toBe(saldoAntes);
    });

    test('deve navegar para Extratos ao clicar em "Consultar movimentos mais antigos", mantendo a conta selecionada', async ({
      page,
    }) => {
      await page.goto('/consultas/saldos-e-movimentos?conta=conta_2');
      await page.getByTestId('saldos-movimentos-ver-mais-antigos').click();

      await expect(page).toHaveURL(/\/consultas\/extratos\?conta=conta_2/);
      await expect(page.getByTestId('extratos-conta')).toHaveValue('conta_2');
    });
  });

  test.describe('Extratos', () => {
    test('deve mostrar os movimentos de uma conta sem filtro de datas', async ({ page }) => {
      await page.goto('/consultas/extratos');
      await page.getByTestId('extratos-filtrar').click();

      await expect(page.getByTestId('extratos-tabela')).toBeVisible();
      await expect(page.getByTestId('extratos-tabela')).toContainText('Salário');
    });

    test('deve mostrar "sem movimentos" quando o período filtrado não tem nenhum', async ({ page }) => {
      await page.goto('/consultas/extratos');
      // Uma data no futuro distante nunca vai ter movimentos.
      await page.getByTestId('extratos-desde').fill('2099-01-01');
      await page.getByTestId('extratos-filtrar').click();

      await expect(page.getByTestId('extratos-sem-movimentos')).toBeVisible();
    });
  });

  test.describe('NIB, IBAN e SWIFT', () => {
    test('deve mostrar o IBAN, o NIB derivado e o SWIFT de cada conta', async ({ page }) => {
      await page.goto('/consultas/nib-iban-swift');

      const primeiroIban = await page.getByTestId('nib-iban-swift-iban').first().innerText();
      const primeiroNib = await page.getByTestId('nib-iban-swift-nib').first().innerText();

      // Em Portugal, o NIB é o IBAN sem os 4 primeiros carateres ("PT" + 2 dígitos de controlo).
      expect(primeiroNib).toBe(primeiroIban.slice(4));
      await expect(page.getByTestId('nib-iban-swift-swift').first()).toHaveText('BPTPPTPL');
    });
  });

  test.describe('Operações agendadas', () => {
    test('deve mostrar as operações agendadas de exemplo', async ({ page }) => {
      await page.goto('/consultas/operacoes-agendadas');

      await expect(page.getByTestId('operacoes-agendadas-tabela')).toContainText('Renda - transferência mensal');
      await expect(page.getByTestId('operacoes-agendadas-tabela')).toContainText('Agendada');
    });
  });
});
