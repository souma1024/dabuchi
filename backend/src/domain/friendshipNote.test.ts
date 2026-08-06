import { describe, expect, it } from 'vitest';

import {
  FRIENDSHIP_NOTE_MAX_LENGTH,
  InvalidFriendshipNoteError,
  normalizeFriendshipNote,
} from './friendshipNote.js';

describe('normalizeFriendshipNote', () => {
  it('前後の空白を除いてメモを返す', () => {
    expect(normalizeFriendshipNote('  大学の友達  ')).toBe('大学の友達');
  });

  it.each(['', '   ', '\n\t'])('空のメモをnullへ戻す: %j', (message) => {
    expect(normalizeFriendshipNote(message)).toBeNull();
  });

  it('255文字のメモを許可する', () => {
    const message = '友'.repeat(FRIENDSHIP_NOTE_MAX_LENGTH);

    expect(normalizeFriendshipNote(message)).toBe(message);
  });

  it('256文字以上のメモを拒否する', () => {
    const message = '友'.repeat(FRIENDSHIP_NOTE_MAX_LENGTH + 1);

    expect(() => normalizeFriendshipNote(message)).toThrow(
      InvalidFriendshipNoteError,
    );
  });

  it('サロゲートペアを1文字として数える', () => {
    const message = '🙂'.repeat(FRIENDSHIP_NOTE_MAX_LENGTH);

    expect(normalizeFriendshipNote(message)).toBe(message);
  });
});
