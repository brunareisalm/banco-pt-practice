import { test, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';
const DEMO_PIN = '1234';
const API_URL = 'http://localhost:4001';

async function login(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(DEMO_USERNAME, DEMO_PASSWORD);
  // Espera o redireciono para /inicio antes de qualquer page.goto() a seguir:
  // um goto() imediato pode cancelar o POST de login ainda em curso (perdendo
  // o token) porque provoca uma navegação completa da página.
  await expect(page).toHaveURL(/\/inicio$/);
}

function parseEuro(texto: string): number {
  const match = texto.match(/([\d.]+,\d{2})\s?€/);
  if (!match) throw new Error(`Não encontrei um valor em euros em "${texto}"`);
  return Number(match[1].replace(/\./g, '').replace(',', '.'));
}

async function saldoAtual(page: Page): Promise<number> {
  const texto = await page.getByTestId('carregamento-conta').locator('option:checked').innerText();
  return parseEuro(texto);
}

async function preencherDados(
  page: Page,
  data: { operador?: string; numero: string; valor: string }
) {
  if (data.operador) {
    await page.getByTestId('carregamento-operador').selectOption(data.operador);
  }
  await page.getByTestId('carregamento-numero').fill(data.numero);
  await page.getByTestId('carregamento-valor').selectOption(data.valor);
  await page.getByTestId('carregamento-continuar').click();
}

/** Cria uma poupança nova (saldo sempre a zero) para testar saldo insuficiente. */
async function criarPoupancaComSaldoZero(page: Page) {
  await page.goto('/poupancas');
  await page.getByTestId('poupancas-criar').click();
  await expect(page.getByTestId('poupancas-criar-mensagem')).toBeVisible();
}

test.describe('BancoPT Practice - Carregamentos', () => {
  // Todos os testes debitam a mesma conta demo partilhada — corrida em série
  // evita que o teste do valor exato seja afetado por outro carregamento a
  // decorrer em paralelo no mesmo saldo.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/carregamentos');
  });

  test('deve aparecer no menu como link direto', async ({ page }) => {
    await page.goto('/inicio');
    await expect(page.getByTestId('nav-carregamentos')).toBeVisible();
    await page.getByTestId('nav-carregamentos').click();
    await expect(page).toHaveURL(/\/carregamentos$/);
    await expect(page.getByRole('heading', { name: 'Carregamentos' })).toBeVisible();
  });

  test('deve apresentar o formulário de dados com os operadores disponíveis em Portugal', async ({ page }) => {
    await expect(page.getByTestId('carregamento-conta')).toBeVisible();
    await expect(page.getByTestId('carregamento-numero')).toBeVisible();
    await expect(page.getByTestId('carregamento-valor')).toBeVisible();

    const opcoesOperador = await page.getByTestId('carregamento-operador').locator('option').allInnerTexts();
    expect(opcoesOperador).toEqual(['MEO', 'NOS', 'Vodafone', 'Lycamobile', 'Digi', 'UZO']);
  });

  test('deve efetuar um carregamento com sucesso e debitar o valor exato', async ({ page }) => {
    const saldoAntes = await saldoAtual(page);

    await preencherDados(page, { operador: 'MEO', numero: '912345678', valor: '10' });
    await page.getByTestId('carregamento-pin').fill(DEMO_PIN);
    await page.getByTestId('carregamento-confirmar').click();

    await expect(page.getByTestId('carregamento-resumo')).toBeVisible();
    await expect(page.getByTestId('carregamento-resumo-estado')).toContainText('Concluída');
    await expect(page.getByTestId('carregamento-resumo')).toContainText('MEO');
    await expect(page.getByTestId('carregamento-resumo')).toContainText('912345678');
    await expect(page.getByTestId('carregamento-resumo')).toContainText('10,00 €');

    await page.getByTestId('carregamento-nova-operacao').click();
    // "Nova operação" volta a pedir as contas ao servidor; esperamos o saldo
    // mostrado deixar de ser o antigo antes de o lermos.
    await expect.poll(() => saldoAtual(page)).not.toBe(saldoAntes);
    const saldoDepois = await saldoAtual(page);
    expect(Math.round((saldoAntes - saldoDepois) * 100) / 100).toBe(10);
  });

  test('deve rejeitar um PIN incorreto', async ({ page }) => {
    await preencherDados(page, { numero: '912345678', valor: '5' });
    await page.getByTestId('carregamento-pin').fill('0000');
    await page.getByTestId('carregamento-confirmar').click();

    await expect(page.getByTestId('carregamento-mensagem')).toHaveText('PIN incorreto.');
  });

  test('deve rejeitar um número de telemóvel inválido', async ({ page }) => {
    await preencherDados(page, { numero: '212345678', valor: '5' }); // não começa em 9
    await page.getByTestId('carregamento-pin').fill(DEMO_PIN);
    await page.getByTestId('carregamento-confirmar').click();

    await expect(page.getByTestId('carregamento-mensagem')).toHaveText(
      'Número inválido — indica um telemóvel português (9 dígitos, começado em 9).'
    );
  });

  test('deve rejeitar um carregamento acima do saldo disponível', async ({ page }) => {
    await criarPoupancaComSaldoZero(page);
    await page.goto('/carregamentos');
    await expect(page.getByTestId('carregamento-conta')).toBeVisible();

    // A poupança recém-criada (saldo a zero) é a última conta da lista.
    const opcoes = await page.getByTestId('carregamento-conta').locator('option').all();
    const valorUltimaOpcao = await opcoes[opcoes.length - 1].getAttribute('value');
    await page.getByTestId('carregamento-conta').selectOption(valorUltimaOpcao!);

    await preencherDados(page, { numero: '912345678', valor: '5' });
    await page.getByTestId('carregamento-pin').fill(DEMO_PIN);
    await page.getByTestId('carregamento-confirmar').click();

    await expect(page.getByTestId('carregamento-mensagem')).toHaveText(
      'Saldo insuficiente para este carregamento.'
    );
  });

  test('deve rejeitar um operador inválido (via API)', async ({ page, request }) => {
    const login = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: DEMO_USERNAME, password: DEMO_PASSWORD },
    });
    const { token } = await login.json();
    const contas = await request.get(`${API_URL}/api/contas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { contas: listaContas } = await contas.json();

    const resposta = await request.post(`${API_URL}/api/carregamentos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        contaId: listaContas[0].id,
        operador: 'OperadoraInexistente',
        numero: '912345678',
        valor: 5,
        pin: DEMO_PIN,
      },
    });

    expect(resposta.status()).toBe(400);
    const body = await resposta.json();
    expect(body.error).toBe('operador_invalido');
  });
});
