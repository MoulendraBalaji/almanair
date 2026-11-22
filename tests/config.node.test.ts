import { describe, expect, it } from 'vitest';
import { config, type AppConfig } from '@/config';

/** Boot-time validation is exercised by simply importing the config. */
describe('application configuration', () => {
  it('exposes positive budgets and limits', () => {
    expect(config.budgets.firstLoadJsGzipKb).toBeGreaterThan(0);
    expect(config.rateLimit.perMinute).toBeGreaterThan(0);
    const typed: AppConfig = config;
    expect(typed.budgets.chartPoints).toBe(24);
  });
});
