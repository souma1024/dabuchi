import { useEffect, useState } from 'react';

import {
  fetchCurrentUser,
  NotAuthenticatedError,
} from '../api/fetchCurrentUser';
import type { CurrentUser } from '../types';

/** 現在ユーザーの取得結果。 */
export interface UseCurrentUserResult {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
  /** 未ログインだったか。取得前と取得失敗時はfalse。 */
  isNotAuthenticated: boolean;
}

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : '不明なエラーが発生しました';
}

/** 現在ユーザーを1回だけ取得するフック。 */
export function useCurrentUser(): UseCurrentUserResult {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 未ログインは「エラー」ではなくログイン画面へ促す合図なので、分けて持つ。
  const [isNotAuthenticated, setIsNotAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchCurrentUser()
      .then((user) => {
        if (!active) {
          return;
        }
        setCurrentUser(user);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        if (caught instanceof NotAuthenticatedError) {
          setIsNotAuthenticated(true);
          return;
        }
        setError(toErrorMessage(caught));
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { currentUser, isLoading, error, isNotAuthenticated };
}
