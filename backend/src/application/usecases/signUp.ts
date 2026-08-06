import { hashPassword } from '../../domain/password.js';
import {
  createSessionToken,
  hashSessionToken,
  sessionExpiryFrom,
  type Session,
} from '../../domain/session.js';
import {
  InvalidSignUpError,
  UserIdAlreadyTakenError,
} from '../errors/authErrors.js';
import type { AuthRepository } from '../ports/authRepository.js';
import type { Clock } from './logIn.js';

const USER_ID_MAX_LENGTH = 64;
const USER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
const USER_NAME_MAX_LENGTH = 100;
// 登録時点では画像を選ばせないため、既定のアイコンを割り当てる。
const DEFAULT_PROFILE_URL = '/assets/profiles/human1.png';

export interface SignUpInput {
  userId: string;
  password: string;
  name: string;
}

export type UserIdGenerator = () => string;

export class SignUp {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly generateId: UserIdGenerator,
    private readonly now: Clock = () => new Date(),
  ) {}

  async execute(input: SignUpInput): Promise<Session> {
    const userId = normalizeUserId(input.userId);
    const name = normalizeName(input.name);
    // 形式エラーはハッシュ化の前に返す。無駄な計算を避け、応答時間も揃える。
    const passwordHash = await hashPassword(input.password);
    const id = this.generateId();

    const token = createSessionToken();
    const expiresAt = sessionExpiryFrom(this.now());

    // ユーザーとセッションは同時に成立させる。片方だけ残ると、登録に失敗したのに
    // そのuser_idだけ使用済みになり、本人が二度と登録できなくなる。
    const created = await this.authRepository.createUserWithSession(
      {
        id,
        userId,
        name,
        profileUrl: DEFAULT_PROFILE_URL,
        passwordHash,
      },
      { tokenHash: hashSessionToken(token), userId: id, expiresAt },
    );

    if (!created) {
      throw new UserIdAlreadyTakenError();
    }

    return { token, userId: id, expiresAt };
  }
}

function normalizeUserId(value: string): string {
  const userId = value.trim();

  if (userId.length === 0) {
    throw new InvalidSignUpError('A user id is required.');
  }

  if (userId.length > USER_ID_MAX_LENGTH) {
    throw new InvalidSignUpError(
      `A user id must contain at most ${USER_ID_MAX_LENGTH} characters.`,
    );
  }

  // 友達追加で入力してもらう値なので、記号を絞って打ち間違いを減らす。
  if (!USER_ID_PATTERN.test(userId)) {
    throw new InvalidSignUpError(
      'A user id must contain only letters, digits, hyphens and underscores.',
    );
  }

  return userId;
}

function normalizeName(value: string): string {
  const name = value.trim();

  if (name.length === 0) {
    throw new InvalidSignUpError('A user name is required.');
  }

  if ([...name].length > USER_NAME_MAX_LENGTH) {
    throw new InvalidSignUpError(
      `A user name must contain at most ${USER_NAME_MAX_LENGTH} characters.`,
    );
  }

  return name;
}
