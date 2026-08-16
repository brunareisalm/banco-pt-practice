import { test, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';
const DEMO_PIN = '1234';
const API_URL = 'http://localhost:4001';

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

test.describe('BancoPT Practice - Cartão de Crédito', () => {
  // Os testes partilham cartões/saldos da conta demo — corrida em série e
  // por esta ordem específica evita que um teste invalide a condição
  // (ex.: saldo em dívida) que o teste seguinte precisa de encontrar.
  test.describe.configure({ mode: 'serial' });

  test.describe('Pagar Cartão de Crédito', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/cartoes/pagar-credito');
    });

    test('deve bloquear um valor acima do saldo em dívida (validação HTML5 pelo max)', async ({ page }) => {
      const opcaoTexto = await page.getByTestId('cartao-pagar-cartao').locator('option:checked').innerText();
      const saldoDevedor = parseEuro(opcaoTexto);
      const valorInput = page.getByTestId('cartao-pagar-valor');

      // O campo tem max={saldoDevedor}, por isso o próprio browser bloqueia
      // a submissão antes de sequer chegar ao passo de confirmação — o
      // servidor nunca é consultado com este valor.
      await valorInput.fill(String(saldoDevedor + 1000));
      await page.getByTestId('cartao-pagar-continuar').click();

      await expect(page.getByTestId('cartao-pagar-overlay')).toBeHidden();
      const isValid = await valorInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBe(false);
    });

    test('deve rejeitar via API um valor acima do saldo em dívida (o servidor também valida, não só o HTML5)', async ({
      request,
    }) => {
      const loginResp = await request.post(`${API_URL}/api/auth/login`, {
        data: { username: DEMO_USERNAME, password: DEMO_PASSWORD },
      });
      const { token } = await loginResp.json();

      const cartoesResp = await request.get(`${API_URL}/api/cartoes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { cartoes } = await cartoesResp.json();
      const cartaoCredito = cartoes.find(
        (c: { tipo: string; estado: string; saldoDevedor?: number }) =>
          c.tipo === 'CREDITO' && c.estado === 'ATIVO' && (c.saldoDevedor ?? 0) > 0
      );

      const contasResp = await request.get(`${API_URL}/api/contas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { contas } = await contasResp.json();

      const pagamento = await request.post(`${API_URL}/api/cartoes/${cartaoCredito.id}/pagar`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { contaId: contas[0].id, valor: (cartaoCredito.saldoDevedor ?? 0) + 1000, pin: DEMO_PIN },
      });

      expect(pagamento.status()).toBe(400);
      const body = await pagamento.json();
      expect(body.error).toBe('valor_acima_divida');
    });

    test('deve rejeitar um PIN incorreto', async ({ page }) => {
      await page.getByTestId('cartao-pagar-valor').fill('1');
      await page.getByTestId('cartao-pagar-continuar').click();
      await page.getByTestId('cartao-pagar-pin').fill('0000');
      await page.getByTestId('cartao-pagar-confirmar').click();

      await expect(page.getByTestId('cartao-pagar-mensagem')).toHaveText('PIN incorreto.');
    });

    test('deve efetuar um pagamento com sucesso e reduzir o saldo em dívida', async ({ page }) => {
      const opcaoTexto = await page.getByTestId('cartao-pagar-cartao').locator('option:checked').innerText();
      const saldoAntes = parseEuro(opcaoTexto);

      await page.getByTestId('cartao-pagar-valor').fill('10');
      await page.getByTestId('cartao-pagar-continuar').click();
      await page.getByTestId('cartao-pagar-pin').fill(DEMO_PIN);
      await page.getByTestId('cartao-pagar-confirmar').click();

      await expect(page.getByTestId('cartao-pagar-resumo')).toBeVisible();
      await expect(page.getByTestId('cartao-pagar-resumo-estado')).toContainText('Concluída');

      await page.getByTestId('cartao-pagar-nova-operacao').click();
      await expect.poll(async () => {
        const texto = await page.getByTestId('cartao-pagar-cartao').locator('option:checked').innerText();
        return parseEuro(texto);
      }).toBe(Math.round((saldoAntes - 10) * 100) / 100);
    });
  });

  test.describe('Aumento de Limite', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/cartoes/aumento-limite');
    });

    test('deve rejeitar um novo limite inferior ou igual ao atual', async ({ page }) => {
      const limiteAtualTexto = await page.getByTestId('aumento-limite-atual').innerText();
      const limiteAtual = parseEuro(limiteAtualTexto);

      await page.getByTestId('aumento-limite-novo-limite').fill(String(limiteAtual));
      await page.getByTestId('aumento-limite-submit').click();

      await expect(page.getByTestId('aumento-limite-mensagem')).toHaveText(
        'O novo limite tem de ser superior ao limite atual.'
      );
    });

    test('deve rejeitar um limite acima de 10 000 €', async ({ page }) => {
      await page.getByTestId('aumento-limite-novo-limite').fill('15000');
      await page.getByTestId('aumento-limite-submit').click();

      await expect(page.getByTestId('aumento-limite-mensagem')).toHaveText(
        'O novo limite não pode ser superior a 10 000 €.'
      );
    });

    test('deve aumentar o limite com sucesso', async ({ page }) => {
      const limiteAtualTexto = await page.getByTestId('aumento-limite-atual').innerText();
      const limiteAtual = parseEuro(limiteAtualTexto);
      const novoLimite = limiteAtual + 100;

      await page.getByTestId('aumento-limite-novo-limite').fill(String(novoLimite));
      await page.getByTestId('aumento-limite-submit').click();

      await expect(page.getByTestId('aumento-limite-mensagem')).toHaveText(
        'Pedido aprovado. O teu novo limite já está disponível.'
      );
      await expect(page.getByTestId('aumento-limite-atual')).toContainText(
        novoLimite.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
      );
    });
  });

  test.describe('Movimentos de Cartões de Crédito', () => {
    test('deve mostrar os movimentos de exemplo do cartão de crédito', async ({ page }) => {
      await login(page);
      await page.goto('/cartoes/movimentos-credito');

      await expect(page.getByTestId('tabela-movimentos-cartao')).toContainText('Compra Continente');
      await expect(page.getByTestId('tabela-movimentos-cartao')).toContainText('Compra Amazon');
      await expect(page.getByTestId('tabela-movimentos-cartao')).toContainText('Farmácia');
    });
  });

  test.describe('Pedido de Cartão de Crédito', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/cartoes/pedido-credito');
    });

    test('deve bloquear um limite pretendido igual a zero (validação HTML5)', async ({ page }) => {
      const limiteInput = page.getByTestId('pedido-cartao-limite');
      await limiteInput.fill('0');
      await page.getByTestId('pedido-cartao-submit').click();

      await expect(page.getByTestId('pedido-cartao-mensagem')).toBeHidden();
      const isValid = await limiteInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBe(false);
    });

    test('deve efetuar o pedido com sucesso', async ({ page }) => {
      await page.getByTestId('pedido-cartao-limite').fill('600');
      await page.getByTestId('pedido-cartao-submit').click();

      await expect(page.getByTestId('pedido-cartao-mensagem')).toHaveText(
        'Pedido efetuado com sucesso. O teu novo cartão está pendente de ativação.'
      );
    });
  });

  test.describe('Ativação de Cartão de Crédito', () => {
    // Cada teste pede o seu próprio cartão novo primeiro, para garantir
    // sempre um cartão pendente de ativação, independentemente do que os
    // outros testes desta suite já ativaram/cancelaram.
    async function pedirNovoCartao(page: Page) {
      await page.goto('/cartoes/pedido-credito');
      await page.getByTestId('pedido-cartao-limite').fill('400');
      await page.getByTestId('pedido-cartao-submit').click();
      await expect(page.getByTestId('pedido-cartao-mensagem')).toBeVisible();
    }

    test.beforeEach(async ({ page }) => {
      await login(page);
      await pedirNovoCartao(page);
      await page.goto('/cartoes/ativacao-credito');
    });

    test('deve rejeitar um PIN incorreto', async ({ page }) => {
      await page.getByTestId('ativacao-cartao-pin').fill('0000');
      await page.getByTestId('ativacao-cartao-submit').click();

      await expect(page.getByTestId('ativacao-cartao-mensagem')).toHaveText('PIN incorreto.');
    });

    test('deve ativar o cartão com sucesso', async ({ page }) => {
      await page.getByTestId('ativacao-cartao-pin').fill(DEMO_PIN);
      await page.getByTestId('ativacao-cartao-submit').click();

      await expect(page.getByTestId('ativacao-cartao-mensagem')).toHaveText('Cartão ativado com sucesso.');
    });
  });

  test.describe('Cancelar Cartão de Crédito', () => {
    test('deve rejeitar o cancelamento de um cartão com saldo em dívida', async ({ page }) => {
      await login(page);
      await page.goto('/cartoes/cancelar-credito');

      // O cartão original do seed (o primeiro da lista) ainda tem saldo em
      // dívida — os testes de "Pagar Cartão de Crédito" acima só pagaram
      // 10€ de um saldo bem maior.
      const primeiraOpcaoValor = await page
        .getByTestId('cancelar-cartao-cartao')
        .locator('option')
        .first()
        .getAttribute('value');
      await page.getByTestId('cancelar-cartao-cartao').selectOption(primeiraOpcaoValor!);

      await page.getByTestId('cancelar-cartao-pin').fill(DEMO_PIN);
      await page.getByTestId('cancelar-cartao-submit').click();

      await expect(page.getByTestId('cancelar-cartao-mensagem')).toHaveText(
        'Não é possível cancelar um cartão com saldo em dívida.'
      );
    });

    test('deve cancelar com sucesso um cartão sem saldo em dívida', async ({ page }) => {
      await login(page);

      // Pede e ativa um cartão novo, que começa sempre sem saldo em dívida.
      await page.goto('/cartoes/pedido-credito');
      await page.getByTestId('pedido-cartao-limite').fill('300');
      await page.getByTestId('pedido-cartao-submit').click();
      await expect(page.getByTestId('pedido-cartao-mensagem')).toBeVisible();

      await page.goto('/cartoes/ativacao-credito');
      await page.getByTestId('ativacao-cartao-pin').fill(DEMO_PIN);
      await page.getByTestId('ativacao-cartao-submit').click();
      await expect(page.getByTestId('ativacao-cartao-mensagem')).toBeVisible();

      await page.goto('/cartoes/cancelar-credito');
      // O cartão recém-ativado é sempre a última opção da lista (o mais recente).
      const opcoes = page.getByTestId('cancelar-cartao-cartao').locator('option');
      const ultimaOpcaoValor = await opcoes.last().getAttribute('value');
      await page.getByTestId('cancelar-cartao-cartao').selectOption(ultimaOpcaoValor!);

      await page.getByTestId('cancelar-cartao-pin').fill(DEMO_PIN);
      await page.getByTestId('cancelar-cartao-submit').click();

      await expect(page.getByTestId('cancelar-cartao-mensagem')).toHaveText('Cartão cancelado com sucesso.');
    });
  });
});
