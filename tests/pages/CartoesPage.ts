import { Page, Locator } from '@playwright/test';

export class CartoesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/cartoes');
  }

  cartao(id: string): Locator {
    return this.page.getByTestId(`cartao-${id}`);
  }

  estado(id: string): Locator {
    return this.cartao(id).getByTestId('cartao-estado');
  }

  toggleButton(id: string): Locator {
    return this.cartao(id).getByTestId('cartao-toggle-estado');
  }

  async lerEstado(id: string): Promise<'ATIVO' | 'BLOQUEADO'> {
    const texto = await this.estado(id).innerText();
    return texto.trim() === 'Ativo' ? 'ATIVO' : 'BLOQUEADO';
  }

  /** Garante que o cartão fica no estado pedido antes do teste começar a validar transições. */
  async garantirEstado(id: string, estadoDesejado: 'ATIVO' | 'BLOQUEADO') {
    if ((await this.lerEstado(id)) !== estadoDesejado) {
      await this.toggleButton(id).click();
      await this.estado(id).waitFor({ state: 'visible' });
    }
  }
}
