import { signUp } from '../api/authClient';
import { AuthForm, type AuthFormField } from '../components/AuthForm';

interface SignUpPageProps {
  /** 登録できたときに呼ばれる。登録するとそのままログイン状態になる。 */
  onSignedUp: () => void;
  /** ログインへ戻る操作。 */
  onGoToLogIn: () => void;
}

const fields: AuthFormField[] = [
  {
    name: 'displayName',
    label: '名前',
    type: 'text',
    placeholder: '山田 太郎',
    autoComplete: 'name',
  },
  {
    name: 'userId',
    label: 'ユーザーID',
    type: 'text',
    placeholder: 'yamada-taro',
    autoComplete: 'username',
    hint: '友達追加のときに相手へ伝えるIDです。英数字・ハイフン・アンダースコアが使えます',
  },
  {
    name: 'password',
    label: 'パスワード',
    type: 'password',
    autoComplete: 'new-password',
    hint: '8文字以上',
  },
];

/** 新規登録画面。登録するとそのままログイン状態になる。 */
export function SignUpPage({ onSignedUp, onGoToLogIn }: SignUpPageProps) {
  return (
    <AuthForm
      title="アカウントを作る"
      fields={fields}
      submitLabel="登録する"
      onSubmit={async (values) => {
        await signUp({
          userId: values.userId ?? '',
          password: values.password ?? '',
          name: values.displayName ?? '',
        });
        onSignedUp();
      }}
      footer={
        <button
          type="button"
          onClick={onGoToLogIn}
          className="border-none bg-transparent text-sm text-blue-600 underline"
        >
          ログインへ戻る
        </button>
      }
    />
  );
}
