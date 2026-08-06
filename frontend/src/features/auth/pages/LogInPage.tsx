import { logIn } from '../api/authClient';
import { AuthForm, type AuthFormField } from '../components/AuthForm';

interface LogInPageProps {
  /** ログインできたときに呼ばれる。遷移は呼び出し側が担う。 */
  onLoggedIn: () => void;
  /** 新規登録へ移る操作。 */
  onGoToSignUp: () => void;
}

const fields: AuthFormField[] = [
  {
    name: 'userId',
    label: 'ユーザーID',
    type: 'text',
    placeholder: 'friend-001',
    autoComplete: 'username',
  },
  {
    name: 'password',
    label: 'パスワード',
    type: 'password',
    autoComplete: 'current-password',
  },
];

/** ログイン画面。ユーザーIDとパスワードでセッションを作る。 */
export function LogInPage({ onLoggedIn, onGoToSignUp }: LogInPageProps) {
  return (
    <AuthForm
      title="ログイン"
      fields={fields}
      submitLabel="ログイン"
      onSubmit={async (values) => {
        await logIn(values.userId ?? '', values.password ?? '');
        onLoggedIn();
      }}
      footer={
        <button
          type="button"
          onClick={onGoToSignUp}
          className="border-none bg-transparent text-sm text-blue-600 underline"
        >
          アカウントを作る
        </button>
      }
    />
  );
}
