import { verifyPassword } from '../../domain/password.js';
import {
  createSessionToken,
  hashSessionToken,
  sessionExpiryFrom,
  type Session,
} from '../../domain/session.js';
import { InvalidCredentialsError } from '../errors/authErrors.js';
import type { AuthRepository } from '../ports/authRepository.js';

export interface LogInInput {
  userId: string;
  password: string;
}

/** 現在時刻の取得。テストから固定できるよう外から渡す。 */
export type Clock = () => Date;

export class LogIn {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async execute(input: LogInInput): Promise<Session> {
    const credential = await this.authRepository.findCredentialByUserId(
      input.userId.trim(),
    );

    // ユーザーが無い場合もパスワード違いと同じエラーにする。
    // 存在するuser_idを総当たりで特定させないため。
    if (!credential?.passwordHash) {
      throw new InvalidCredentialsError();
    }

    if (!(await verifyPassword(input.password, credential.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    const token = createSessionToken();
    const expiresAt = sessionExpiryFrom(this.now());

    await this.authRepository.createSession({
      tokenHash: hashSessionToken(token),
      userId: credential.id,
      expiresAt,
    });

    return { token, userId: credential.id, expiresAt };
  }
}
