import { describe, expect, it } from 'vitest';

import { loadMockAuthenticationConfig } from './mockAuthenticationConfig.js';

describe('loadMockAuthenticationConfig', () => {
  it('mockログインする公開ユーザーIDを読み込む', () => {
    expect(
      loadMockAuthenticationConfig({
        NODE_ENV: 'development',
        AUTH_MODE: 'mock',
        MOCK_USER_ID: ' friend-001 ',
      }),
    ).toEqual({ currentUserId: 'friend-001' });
  });

  it('mock以外の認証モードを拒否する', () => {
    expect(() =>
      loadMockAuthenticationConfig({
        NODE_ENV: 'development',
        AUTH_MODE: 'session',
        MOCK_USER_ID: 'friend-001',
      }),
    ).toThrow('AUTH_MODE must be mock until login is implemented.');
  });

  it('production環境ではmock認証を拒否する', () => {
    expect(() =>
      loadMockAuthenticationConfig({
        NODE_ENV: 'production',
        AUTH_MODE: 'mock',
        MOCK_USER_ID: 'friend-001',
      }),
    ).toThrow('Mock authentication is allowed only in development or test.');
  });

  it('NODE_ENVが未設定ならmock認証を拒否する', () => {
    expect(() =>
      loadMockAuthenticationConfig({
        AUTH_MODE: 'mock',
        MOCK_USER_ID: 'friend-001',
      }),
    ).toThrow('Mock authentication is allowed only in development or test.');
  });

  it.each([undefined, '', '  '])(
    'MOCK_USER_IDが%pなら設定エラーにする',
    (mockUserId) => {
      expect(() =>
        loadMockAuthenticationConfig({
          NODE_ENV: 'test',
          AUTH_MODE: 'mock',
          MOCK_USER_ID: mockUserId,
        }),
      ).toThrow('MOCK_USER_ID is required.');
    },
  );
});
