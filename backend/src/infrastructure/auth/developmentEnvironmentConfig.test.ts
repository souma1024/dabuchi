import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

interface BackendPackage {
  scripts?: Record<string, string>;
}

describe('development environment configuration', () => {
  it('ローカル起動ではルート.envを読み込む', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../../../package.json', import.meta.url), 'utf8'),
    ) as BackendPackage;

    expect(packageJson.scripts?.dev).toBe(
      'tsx watch --env-file=../.env src/server.ts',
    );
  });

  it('Composeでは注入済みの環境変数を使う', async () => {
    const compose = await readFile(
      new URL('../../../../compose.yaml', import.meta.url),
      'utf8',
    );

    expect(compose).toContain(
      'command: sh -c "npm install && npm run dev:container"',
    );
  });
});
