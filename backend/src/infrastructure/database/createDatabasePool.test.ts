import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDatabasePool } from './createDatabasePool.js';
import type { DatabaseConfig } from './databaseConfig.js';

interface FakeConnection {
  query: (sql: string) => Promise<unknown>;
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

const CONFIG: DatabaseConfig = {
  host: '127.0.0.1',
  port: 3306,
  database: 'dabuchi',
  user: 'dabuchi_app',
  password: 'local-password',
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

    expect(createPoolMock).toHaveBeenCalledWith({
      ...CONFIG,
      connectionLimit: 5,
      dateStrings: true,
    });
    expect(onMock).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  it('新規コネクションのセッションtime_zoneをUTCへ固定する', () => {
    createDatabasePool(CONFIG);
    const query = vi
      .fn<(sql: string) => Promise<unknown>>()
      .mockResolvedValue(undefined);
    const destroy = vi.fn();

    getConnectionListener()({ query, destroy });

    expect(query).toHaveBeenCalledWith("SET time_zone = '+00:00'");
    expect(destroy).not.toHaveBeenCalled();
  });

  it('time_zone固定に失敗したコネクションを破棄する', async () => {
    createDatabasePool(CONFIG);
    const query = vi
      .fn<(sql: string) => Promise<unknown>>()
      .mockRejectedValue(new Error('SET time_zone failed'));
    const destroy = vi.fn();

    getConnectionListener()({ query, destroy });

    await vi.waitFor(() => {
      expect(destroy).toHaveBeenCalledTimes(1);
    });
  });
});
