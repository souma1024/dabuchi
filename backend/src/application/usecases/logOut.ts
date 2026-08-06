import { hashSessionToken } from '../../domain/session.js';
import type { AuthRepository } from '../ports/authRepository.js';

export class LogOut {
  constructor(private readonly authRepository: AuthRepository) {}

  /** ログアウトは冪等。tokenが無い・既に無効でも成功として扱う。 */
  async execute(token: string | null): Promise<void> {
    if (token === null) {
      return;
    }

    await this.authRepository.deleteSession(hashSessionToken(token));
  }
}
