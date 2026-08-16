/**
 * Esvazia todas as tabelas da base de dados configurada (ficheiro local ou
 * Turso, conforme TURSO_DATABASE_URL em .env) — o seed volta a correr no
 * arranque seguinte do servidor. Uso: `npm run db:reset`.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import path from "path";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, "..", "data", "banco.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const TABELAS = ["users", "contas", "movimentos", "cartoes", "movimentos_cartao", "operacoes_agendadas"];

async function main() {
  for (const tabela of TABELAS) {
    await db.execute(`DELETE FROM ${tabela}`).catch(() => {
      // a tabela pode ainda não existir (primeira vez) — ignora
    });
  }
  console.log("Base de dados esvaziada. O seed volta a correr no próximo arranque do servidor.");
}

main();
