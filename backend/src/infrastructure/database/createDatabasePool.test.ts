import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDatabasePool } from './createDatabasePool.js';
import type { DatabaseConfig } from './databaseConfig.js';

type QueryCallback = (error: unknown) => void;

interface FakeConnection {
  query: (sql: string, callback: QueryCallback) => void;
  destroy: () => void;
}

type ConnectionListener = (connection: FakeConnection) => void;

const { createPoolMock, onMock } = vi.hoisted(() => ({
  createPoolMock: vi.fn<(options: unknown) => unknown>(),
  onMock: vi.fn<(event: string, listener: ConnectionListener) => unknown>(),
}));

vi.mock('mysql2/promise', () => ({
  createPool: createPoolMock,
}));

// sslを除いた接続オプション。createPoolへはこの形で渡る。
const CONNECTION_OPTIONS = {
  host: '127.0.0.1',
  port: 3306,
  database: 'dabuchi',
  user: 'dabuchi_app',
  password: 'local-password',
};

const CONFIG: DatabaseConfig = {
  host: '127.0.0.1',
  port: 3306,
  database: 'dabuchi',
  user: 'dabuchi_app',
  password: 'local-password',
  ssl: false,
};

function getConnectionListener(): ConnectionListener {
  const call = onMock.mock.calls.find(([event]) => event === 'connection');

  if (!call) {
    throw new Error('connection listener was not registered');
  }

  return call[1];
}

describe('createDatabasePool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPoolMock.mockReturnValue({ on: onMock });
  });

  it('接続オプションを渡し、新規コネクションのリスナーを登録する', () => {
    createDatabasePool(CONFIG);

    // sslは接続オプションへそのまま渡さず、有効なときだけTLS設定へ変換する。
    expect(createPoolMock).toHaveBeenCalledWith({
      ...CONNECTION_OPTIONS,
      connectionLimit: 5,
      dateStrings: true,
    });
    expect(onMock).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  it('新規コネクションのセッションtime_zoneをUTCへ固定する', () => {
    createDatabasePool(CONFIG);
    const query = vi.fn<(sql: string, callback: QueryCallback) => void>();
    const destroy = vi.fn();

    getConnectionListener()({ query, destroy });

    expect(query).toHaveBeenCalledWith(
      "SET time_zone = '+00:00'",
      expect.any(Function),
    );

    // 成功時（error なし）はコネクションを破棄しない。
    const callback = query.mock.calls[0]?.[1];
    callback?.(null);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('time_zone固定に失敗したコネクションを破棄する', () => {
    createDatabasePool(CONFIG);
    const query = vi.fn<(sql: string, callback: QueryCallback) => void>();
    const destroy = vi.fn();

    getConnectionListener()({ query, destroy });

    const callback = query.mock.calls[0]?.[1];
    callback?.(new Error('SET time_zone failed'));
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
