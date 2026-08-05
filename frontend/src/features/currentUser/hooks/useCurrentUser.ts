import { useEffect, useState } from 'react';

import { fetchCurrentUser } from '../api/fetchCurrentUser';
import type { CurrentUser } from '../types';

/** 現在ユーザーの取得結果。 */
export interface UseCurrentUserResult {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
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
        if (active) {
          setError(toErrorMessage(caught));
        }
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

  return { currentUser, isLoading, error };
}
