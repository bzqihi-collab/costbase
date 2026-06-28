import cron from 'node-cron';
import { getActiveSources } from '../db/queries/sources';
import { getAdapter } from '../adapters/index';
import { runSync } from './pipeline';

export function startScheduler(): void {
  // Daily at 09:00, check which sources need syncing
  cron.schedule('0 9 * * *', async () => {
    console.log('[Scheduler] Checking sync schedule...');
    const sources = getActiveSources();
    for (const source of sources) {
      const adapter = getAdapter(source.name);
      if (adapter) {
        try {
          console.log(`[Scheduler] Running sync: ${source.name}`);
          await runSync(adapter);
        } catch (e: any) {
          console.error(`[Scheduler] Sync failed for ${source.name}:`, e.message);
        }
      }
    }
  });

  console.log('[Scheduler] Started — daily check at 09:00');
}
