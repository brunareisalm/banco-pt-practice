# BancoPT Practice

Banco fictício em português (PT-PT), feito só para tu praticares testes de
**login, navegação e transferências** — sem depender de nenhum site
partilhado por milhares de outras pessoas (ao contrário do ParaBank, onde
tiveste problemas de username duplicado). Corre localmente e tens controlo
total dos dados.

## Estrutura

```
banco-pt-practice/
├── server/     # API Node.js + Express + TypeScript
│   └── data/   # banco.db (SQLite) — criado automaticamente, não é versionado
├── client/     # Frontend React + Vite + TypeScript
└── package.json  # scripts de conveniência para correr tudo junto
```

## Base de dados

Os dados ficam guardados num ficheiro SQLite (`server/data/banco.db`),
criado automaticamente na primeira vez que o servidor arranca — persistem
entre reinícios, tal como um banco a sério. Não precisas de instalar nem
configurar nada: o `node:sqlite` já vem incluído no Node.js.

Para voltar a começar do zero (repor os dados de demonstração):

```bash
npm run db:reset   # apaga o ficheiro; o seed volta a correr no arranque seguinte
```

## Como correr

```bash
npm run install:all   # instala as dependências do server e do client
npm run dev           # arranca o backend (porta 4001) e o frontend (porta 5173) em simultâneo
```

Depois abre **http://localhost:5173** no browser.

### Utilizadores de demonstração

```
Username: demo
Password: demo123
```

Já vem com 2 contas à Ordem e 1 Poupança, com movimentos de exemplo
(salário, renda, compra no supermercado, transferência recebida), para
veres logo o extrato preenchido e teres onde escolher em
transferências/pagamentos/MB WAY. O PIN é `1234`.

**A password desta conta não pode ser alterada** (é bloqueado no servidor,
com uma mensagem específica em Definições) — assim o guia acima continua
sempre válido, mesmo que a partires para explorar o ecrã de Alterar
Password.

```
Username: breisalm
Password: br163264
```

Um segundo utilizador, sem essa restrição, com mais dados para explorares
à vontade: 3 contas à Ordem, 3 Poupanças e 6 cartões (3 de débito + 3 de
crédito), todos com saldos/limites generosos. O PIN é `0000` (podes
alterá-lo em Definições, tal como a password).

Também podes criar a tua própria conta em "Regista-te aqui" — como a base
de dados é só tua, nunca vais ter colisão de username com mais ninguém.
Utilizadores novos registados começam sempre com PIN `0000`, a alterar em
Definições.

## Funcionalidades

- **Página inicial** — saudação, saldo total (soma de todas as contas) e
  acesso rápido a Contas, Transferir, Pagamentos, MB WAY e Cartões
  (`/inicio`, destino depois do login)
- **Login / Logout** (`/login`)
- **Registo de utilizador** (`/registo`) — gera automaticamente uma conta à
  ordem (DO) com IBAN português e saldo inicial de boas-vindas (500€)
- **Lista de contas** com saldo e últimos movimentos, distinguindo Conta à
  Ordem de Conta Poupança, com link para Saldos e Movimentos de cada conta
  (`/contas`)
- **Transferências** entre IBANs, em 3 passos — dados → confirmar com PIN
  (overlay) → resumo com data/hora — com validações (saldo insuficiente,
  valor inválido, mesma conta) (`/transferencia`)
- **Pagamentos** (menu com submenus):
  - **Pagamento de Serviços ou Compras** por referência Multibanco —
    entidade (5 dígitos) + referência (9 dígitos) + valor, no fluxo de 3
    passos (`/pagamentos`)
  - **Pagamento ao Estado e Setor Público** — mais 3 submenus, todos no
    mesmo fluxo de 3 passos com PIN:
    - **Pagamento ao Estado** — referência (9 dígitos) + valor (`/pagamentos/estado`)
    - **Pagamento da Segurança Social** — NISS (11 dígitos) + período
      (MM/AAAA) + valor (`/pagamentos/seguranca-social`)
    - **Pagamento da TSU** — NISS + período + valor (`/pagamentos/tsu`)
- **MB WAY** — ativação de carteira digital associando um número de
  telemóvel português (9 dígitos, começado em 9), com opção de mudar o
  número depois, e pagamentos MB WAY (com PIN de confirmação) a débito de
  qualquer conta (`/mbway`)
- **Consultas** (menu com submenus):
  - **Saldos e Movimentos** — seletor de conta + saldo atual + movimentos
    dos últimos 90 dias, com um botão "Consultar movimentos mais antigos"
    que leva a Extratos (com a mesma conta pré-selecionada) para consultar
    qualquer movimento mais antigo (`/consultas/saldos-e-movimentos`)
  - **Extratos** — extrato de uma conta com filtro opcional por período
    (desde/até), sem limite de data (`/consultas/extratos`)
  - **NIB, IBAN e SWIFT** — dados bancários de cada conta (o NIB é
    derivado do IBAN, e o SWIFT é fixo `BPTPPTPL` — banco fictício único)
    (`/consultas/nib-iban-swift`)
  - **Operações agendadas** — lista de pagamentos/transferências futuros
    já agendados (`/consultas/operacoes-agendadas`)
- **Cartões** (menu com submenus):
  - **Dados de Cartões** — cartão de débito (associado à conta principal)
    e cartão(ões) de crédito (com limite e saldo em dívida), com
    bloquear/desbloquear (`/cartoes`)
  - **Pagar Cartão de Crédito** — paga (parcial ou totalmente) o saldo em
    dívida de um cartão de crédito, fluxo de 3 passos com PIN
    (`/cartoes/pagar-credito`)
  - **Aumento de Limite** — pede um novo limite para um cartão de crédito
    (sem PIN — é só um pedido, não movimenta dinheiro), com limite máximo
    de 10 000 € (`/cartoes/aumento-limite`)
  - **Movimentos de Cartões de Crédito** — extrato de compras de um cartão
    de crédito (`/cartoes/movimentos-credito`)
  - **Pedido de Cartão de Crédito** — pede um cartão de crédito novo, que
    fica pendente de ativação (sem PIN) (`/cartoes/pedido-credito`)
  - **Ativação de Cartão de Crédito** — ativa um cartão pendente,
    confirmando com PIN (`/cartoes/ativacao-credito`)
  - **Cancelar Cartão de Crédito** — cancela um cartão de crédito
    (irreversível, confirmado com PIN); rejeitado se o cartão ainda tiver
    saldo em dívida (`/cartoes/cancelar-credito`)
- **Poupanças** — link direto no menu (sem submenus), para gerir contas
  poupança (tipo de conta distinto de Conta à Ordem, já visível em `/contas`):
  criar uma conta poupança nova (saldo sempre a zero), adicionar dinheiro
  (transferência de uma conta à ordem, com PIN) e levantar dinheiro (o
  inverso), e excluir uma conta poupança (irreversível, com PIN — só é
  possível com saldo a zero) (`/poupancas`)
- **Definições** — mudar o idioma de toda a interface entre Português e
  English (guardado no browser), alterar a password de login, e alterar o
  PIN (4 dígitos) usado para confirmar transferências, pagamentos e MB WAY
  (`/definicoes`)

Todos os elementos importantes da UI têm `data-testid` (ex.:
`login-username`, `login-submit`, `conta-saldo`, `transferencia-continuar`,
`transferencia-overlay`, `transferencia-resumo`), prontos para
automatizares com Playwright, Selenium, Cypress, etc. — não precisas de
depender de seletores CSS frágeis.

## API (para se quiseres testar diretamente, tipo o projeto do SIBS)

Base URL: `http://localhost:4001`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/auth/registo` | Cria utilizador + conta DO |
| POST | `/api/auth/login` | Autentica e devolve token |
| POST | `/api/auth/logout` | Invalida o token |
| GET | `/api/contas` | Lista as contas do utilizador autenticado |
| GET | `/api/contas/:id/movimentos` | Extrato de uma conta (aceita `?desde=&ate=` para filtrar por período) |
| POST | `/api/transferencias` | Cria uma transferência (requer `pin`) |
| POST | `/api/pagamentos` | Paga um serviço por referência Multibanco (requer `pin`) |
| GET | `/api/mbway/estado` | Consulta se a carteira MB WAY está ativa |
| POST | `/api/mbway/ativar` | Ativa/associa um número de telemóvel à carteira MB WAY |
| POST | `/api/mbway/pagamentos` | Paga com MB WAY (requer carteira ativa e `pin`) |
| POST | `/api/pagamentos/estado` | Paga ao Estado por referência (requer `pin`) |
| POST | `/api/pagamentos/seguranca-social` | Paga a Segurança Social por NISS + período (requer `pin`) |
| POST | `/api/pagamentos/tsu` | Paga a TSU por NISS + período (requer `pin`) |
| GET | `/api/cartoes` | Lista os cartões do utilizador autenticado |
| POST | `/api/cartoes/:id/bloquear` | Bloqueia um cartão |
| POST | `/api/cartoes/:id/desbloquear` | Desbloqueia um cartão |
| GET | `/api/cartoes/:id/movimentos` | Movimentos de compras de um cartão de crédito |
| POST | `/api/cartoes/:id/pagar` | Paga o saldo em dívida de um cartão de crédito (requer `pin`) |
| POST | `/api/cartoes/:id/aumentar-limite` | Pede um novo limite para um cartão de crédito |
| POST | `/api/cartoes/pedido-credito` | Pede um cartão de crédito novo (fica pendente de ativação) |
| POST | `/api/cartoes/:id/ativar-credito` | Ativa um cartão pendente (requer `pin`) |
| POST | `/api/cartoes/:id/cancelar` | Cancela um cartão de crédito (requer `pin`, rejeita se houver saldo em dívida) |
| GET | `/api/agendamentos` | Lista as operações agendadas do utilizador |
| POST | `/api/poupancas` | Cria uma conta poupança nova (saldo a zero) |
| POST | `/api/poupancas/:id/depositar` | Transfere dinheiro de uma conta à ordem para a poupança (requer `pin`) |
| POST | `/api/poupancas/:id/levantar` | Transfere dinheiro da poupança para uma conta à ordem (requer `pin`) |
| POST | `/api/poupancas/:id/excluir` | Exclui uma conta poupança (requer `pin`, rejeita se o saldo não for zero) |
| POST | `/api/definicoes/password` | Altera a password (`passwordAtual`, `passwordNova`, `confirmarPasswordNova`, mín. 6 caracteres); bloqueado para a conta `demo` |
| POST | `/api/definicoes/pin` | Altera o PIN (`pinAtual`, `pinNovo`, `confirmarPinNovo`) |

Autenticação: `Authorization: Bearer <token>` (o token vem na resposta do
login/registo).

## Quando quiseres testar no mobile (Capacitor)

O frontend já está pronto para ser envolvido com o
[Capacitor](https://capacitorjs.com/) sem precisares de reescrever nada —
é o mesmo código React, só empacotado como app nativa:

```bash
cd client
npm install @capacitor/core @capacitor/cli
npx cap init "BancoPT Practice" "pt.inm.bancopractice" --web-dir=dist

npm run build          # gera a pasta dist/
npx cap add android     # e/ou: npx cap add ios
npx cap sync
npx cap open android    # abre no Android Studio para correr num emulador/dispositivo
```

Notas importantes para essa fase:

1. **A app mobile não vai conseguir falar com `http://localhost:4001`** —
   isso só funciona no browser da tua máquina. Quando gerares a app nativa,
   muda o `VITE_API_URL` no `.env` do client para o IP da tua máquina na
   rede local (ex.: `http://192.168.1.50:4001`) antes de correr `npm run
   build`, para o telemóvel/emulador conseguir alcançar o servidor.
2. Depois de teres a app instalada num emulador ou dispositivo, dá para
   automatizar com **Appium** exatamente como fazes com apps bancárias
   reais — os elementos React Native/Capacitor expõem-se como vistas
   nativas acessíveis ao Appium.
3. Os mesmos `data-testid` que já estão no código ajudam tanto em Playwright
   (web) como, com pequenos ajustes de configuração do Capacitor, podem
   aparecer como atributos acessíveis no lado nativo.

## Ideias para expandir a prática

- Adicionar um ecrã de "Pedido de Empréstimo", para variares mais os fluxos
  de navegação.
- Simular erros de rede (latência, timeouts) no servidor para praticares
  testes de resiliência.
