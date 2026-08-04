import { describe, expect, it } from 'vitest';

import { getErrorMessage } from './errorMessage.js';

describe('getErrorMessage', () => {
  it('Errorのmessageを返す', () => {
    expect(getErrorMessage(new Error('MYSQL_DATABASE is required.'))).toBe(
      'MYSQL_DATABASE is required.',
    );
  });

  it('Error以外には内部値を出さず固定メッセージを返す', () => {
    expect(getErrorMessage({ password: 'secret' })).toBe('Unknown error.');
  });
});
