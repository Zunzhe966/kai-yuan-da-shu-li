import { createApp } from "./app";
import type { Bindings } from "./env";
import { runScheduled } from "./scheduled";

const app = createApp();

export default {
  fetch: app.fetch,
  scheduled(
    _controller: ScheduledController,
    env: Bindings,
    context: ExecutionContext,
  ): void {
    context.waitUntil(runScheduled(env));
  },
};
