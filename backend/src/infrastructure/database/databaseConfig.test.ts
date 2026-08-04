import { describe, expect, it } from 'vitest';

import { loadDatabaseConfig } from './databaseConfig.js';

const validEnvironment: NodeJS.ProcessEnv = {
  MYSQL_DATABASE: 'dabuchi',
  MYSQL_USER: 'dabuchi_app',
  MYSQL_PASSWORD: 'local-password',
};

describe('loadDatabaseConfig', () => {
  it('省略可能な接続先にはローカル開発用の既定値を使う', () => {
    expect(loadDatabaseConfig(validEnvironment)).toEqual({
      host: '127.0.0.1',
      port: 3306,
      database: 'dabuchi',
      user: 'dabuchi_app',
      password: 'local-password',
    });
  });

  it('必須項目がなければ設定エラーにする', () => {
    expect(() => loadDatabaseConfig({ MYSQL_USER: 'dabuchi_app' })).toThrow(
      'MYSQL_DATABASE is required.',
    );
  });

  it('不正なポート番号を拒否する', () => {
    expect(() =>
      loadDatabaseConfig({ ...validEnvironment, MYSQL_PORT: 'invalid' }),
    ).toThrow('MYSQL_PORT must be a valid TCP port.');
  });
});
