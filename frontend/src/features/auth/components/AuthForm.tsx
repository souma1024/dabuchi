import { useState } from 'react';

export interface AuthFormField {
  name: 'userId' | 'password' | 'displayName';
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  autoComplete: string;
  hint?: string;
}

interface AuthFormProps {
  title: string;
  fields: AuthFormField[];
  submitLabel: string;
  /** 入力値を渡す。失敗はrejectで返し、画面側でメッセージを出す。 */
  onSubmit: (values: Record<string, string>) => Promise<void>;
  /** フォームの下に置く導線（ログイン↔新規登録の行き来）。 */
  footer: React.ReactNode;
}

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : '不明なエラーが発生しました';
}

/**
 * ログインと新規登録で共通のフォーム。
 * 項目が違うだけで、入力・送信中の抑止・エラー表示は同じなのでまとめている。
 */
export function AuthForm({
  title,
  fields,
  submitLabel,
  onSubmit,
  footer,
}: AuthFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = fields.every(
    (field) => (values[field.name] ?? '').trim() !== '',
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !isComplete) {
      return;
    }
    setIsSubmitting(true);
    setError(null);

    void onSubmit(values)
      .catch((caught: unknown) => {
        setError(toErrorMessage(caught));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-white px-6 py-10">
      {/* ロゴは飾りで、名前は下のh1が読ませる。 */}
      <img src="/logo.svg" alt="" width={56} height={56} className="mx-auto" />
      <h1 className="mt-3 mb-0 text-center text-xl font-bold text-slate-900">
        DABUCHI
      </h1>
      <h2 className="mt-8 mb-0 text-base font-semibold text-slate-900">
        {title}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <label
              htmlFor={field.name}
              className="text-sm font-semibold text-slate-700"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              value={values[field.name] ?? ''}
              onChange={(event) => {
                setValues((previous) => ({
                  ...previous,
                  [field.name]: event.target.value,
                }));
              }}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              className="rounded-2xl border border-slate-300 px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400"
            />
            {field.hint !== undefined && (
              <p className="m-0 text-xs text-slate-500">{field.hint}</p>
            )}
          </div>
        ))}

        {error !== null && (
          <p role="alert" className="m-0 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !isComplete}
          className="rounded-2xl border-none bg-red-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitLabel}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
    </main>
  );
}
