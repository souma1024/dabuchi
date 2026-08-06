import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

interface BackendPackage {
  scripts?: Record<string, string>;
}

interface RootPackage {
  optionalDependencies?: Record<string, string>;
}

interface PackageLock {
  packages?: Record<string, { version?: string }>;
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

  it('Composeではlockfileとworkspaceを指定して起動する', async () => {
    const compose = await readFile(
      new URL('../../../../compose.yaml', import.meta.url),
      'utf8',
    );

    expect(compose).toContain(
      'command: sh -c "npm ci && npm run dev --workspace frontend -- --host 0.0.0.0"',
    );
    expect(compose).toContain(
      'command: sh -c "npm ci && npm run dev:container --workspace backend"',
    );
  });

  it('AlpineのLinux ARM64とx64用Rolldown bindingをlockする', async () => {
    const rootPackage = JSON.parse(
      await readFile(
        new URL('../../../../package.json', import.meta.url),
        'utf8',
      ),
    ) as RootPackage;
    const packageLock = JSON.parse(
      await readFile(
        new URL('../../../../package-lock.json', import.meta.url),
        'utf8',
      ),
    ) as PackageLock;

    for (const architecture of ['arm64', 'x64']) {
      const dependency = `@rolldown/binding-linux-${architecture}-musl`;
      const lockedPackage = `node_modules/${dependency}`;

      expect(rootPackage.optionalDependencies?.[dependency]).toBe('1.2.2');
      expect(packageLock.packages?.[lockedPackage]?.version).toBe('1.2.2');
    }
  });
});
