import { Page, Locator } from '@playwright/test';

export class MBWayPage {
  readonly page: Page;
  readonly telefoneInput: Locator;
  readonly ativarSubmit: Locator;
  readonly ativarErro: Locator;
  readonly estado: Locator;
  readonly mudarNumeroButton: Locator;
  readonly contaSelect: Locator;
  readonly numeroDestinoInput: Locator;
  readonly valorInput: Locator;
  readonly pinInput: Locator;
  readonly pagarSubmit: Locator;
  readonly mensagem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.telefoneInput = page.getByTestId('mbway-telefone');
    this.ativarSubmit = page.getByTestId('mbway-ativar-submit');
    this.ativarErro = page.getByTestId('mbway-ativar-erro');
    this.estado = page.getByTestId('mbway-estado');
    this.mudarNumeroButton = page.getByTestId('mbway-mudar-numero');
    this.contaSelect = page.getByTestId('mbway-conta');
    this.numeroDestinoInput = page.getByTestId('mbway-numero-destino');
    this.valorInput = page.getByTestId('mbway-valor');
    this.pinInput = page.getByTestId('mbway-pin');
    this.pagarSubmit = page.getByTestId('mbway-submit');
    this.mensagem = page.getByTestId('mbway-mensagem');
  }

  async goto() {
    await this.page.goto('/mbway');
  }

  /**
   * A página mostra "A carregar carteira MB WAY..." enquanto o pedido a
   * GET /api/mbway/estado está pendente. Esperar que esse texto desapareça
   * é frágil: se for verificado antes do React sequer montar, o elemento
   * ainda não existe e waitFor({state:'hidden'}) resolve de imediato,
   * concluindo erradamente que "já carregou". Em vez disso esperamos
   * diretamente por QUALQUER UM dos dois estados finais possíveis
   * (formulário de ativação OU o resumo "carteira ativa") aparecer —
   * um dos dois vai sempre aparecer, nunca ambos.
   */
  private async esperarPronto() {
    await Promise.race([
      this.telefoneInput.waitFor({ state: 'visible' }).catch(() => {}),
      this.estado.waitFor({ state: 'visible' }).catch(() => {}),
    ]);
  }

  /** Garante que o formulário de (re)ativação está visível, independentemente do estado atual. */
  async abrirFormularioDeAtivacao() {
    await this.esperarPronto();
    if (await this.mudarNumeroButton.isVisible()) {
      await this.mudarNumeroButton.click();
    }
    await this.telefoneInput.waitFor({ state: 'visible' });
  }

  async ativar(telefone: string) {
    await this.abrirFormularioDeAtivacao();
    await this.telefoneInput.fill(telefone);
    await this.ativarSubmit.click();
  }

  /** Ativa com o número indicado apenas se a carteira ainda não estiver ativa. */
  async garantirAtivo(telefone: string) {
    await this.esperarPronto();
    const jaAtivo = await this.estado.isVisible();
    if (!jaAtivo) {
      await this.ativar(telefone);
      await this.estado.waitFor({ state: 'visible' });
    }
  }

  async saldoConta(): Promise<number> {
    const texto = await this.contaSelect.locator('option:checked').innerText();
    const match = texto.match(/([\d.]+,\d{2})\s?€/);
    if (!match) throw new Error(`Não encontrei um valor em euros em "${texto}"`);
    return Number(match[1].replace(/\./g, '').replace(',', '.'));
  }

  /** numeroDestino tem por omissão um número válido — passa outro só quando o teste precisar de o variar. */
  async pagar(valor: string, pin: string, numeroDestino = '912345678') {
    await this.numeroDestinoInput.fill(numeroDestino);
    await this.valorInput.fill(valor);
    await this.pinInput.fill(pin);
    await this.pagarSubmit.click();
  }
}
