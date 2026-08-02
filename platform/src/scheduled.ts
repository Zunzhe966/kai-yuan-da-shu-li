import type { Bindings } from "./env";
import { processPendingChangeReports } from "./services/change-reports";
import { executeBackup } from "./services/backup";

export async function runScheduled(env: Bindings): Promise<void> {
  await processPendingChangeReports(env.DB);
  await executeBackup(env.DB, env.BACKUPS);
}
