import type { Bindings } from "./env";
import { processPendingChangeReports } from "./services/change-reports";
import { executeBackup } from "./services/backup";

export async function runScheduledTasks(
  backup: () => Promise<unknown>,
  reports: () => Promise<unknown>,
): Promise<void> {
  let firstError: unknown;
  let failed = false;
  for (const task of [backup, reports]) {
    try {
      await task();
    } catch (error) {
      if (!failed) firstError = error;
      failed = true;
    }
  }
  if (failed) throw firstError;
}

export async function runScheduled(env: Bindings): Promise<void> {
  await runScheduledTasks(
    () => executeBackup(env.DB, env.BACKUPS),
    () => processPendingChangeReports(env.DB),
  );
}
