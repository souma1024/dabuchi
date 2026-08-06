/** ログイン検証に必要な最小限の情報。 */
export interface UserCredential {
  /** 内部UUID。 */
  id: string;
  /** 保存済みのパスワードハッシュ。未設定ならnull（ログインできない）。 */
  passwordHash: string | null;
}

/** 新規登録するユーザー。 */
export interface NewUser {
  id: string;
  userId: string;
  name: string;
  profileUrl: string;
  passwordHash: string;
}

/** セッションから引いた、認証済みユーザーの識別情報。 */
export interface AuthenticatedUser {
  /** 内部UUID。 */
  id: string;
  /** 公開user_id。既存のusecaseはこちらを受け取る。 */
  userId: string;
}

export interface AuthRepository {
  /** 公開user_idで資格情報を引く。存在しなければnull。 */
  findCredentialByUserId: (userId: string) => Promise<UserCredential | null>;
  /** ユーザーを作る。公開user_idが既に使われていればfalseを返す。 */
  createUser: (user: NewUser) => Promise<boolean>;
  /** セッションを保存する。 */
  createSession: (session: {
    tokenHash: Buffer;
    userId: string;
    expiresAt: Date;
  }) => Promise<void>;
  /** 有効なセッションのユーザーを引く。無効・期限切れならnull。 */
  findUserBySessionToken: (
    tokenHash: Buffer,
  ) => Promise<AuthenticatedUser | null>;
  /** セッションを消す。存在しなくても成功として扱う。 */
  deleteSession: (tokenHash: Buffer) => Promise<void>;
}
