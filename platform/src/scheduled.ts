import type { Bindings } from "./env";
import { processPendingChangeReports } from "./services/change-reports";

export async function runScheduled(env: Bindings): Promise<void> {
  await processPendingChangeReports(env.DB);
}
