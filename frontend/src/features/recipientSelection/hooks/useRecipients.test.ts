import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecipientPage } from '../api/fetchRecipients';
import { fetchRecipients } from '../api/fetchRecipients';
import { useRecipients } from './useRecipients';

vi.mock('../api/fetchRecipients', () => ({
  fetchRecipients: vi.fn(),
}));

const mockedFetchRecipients = vi.mocked(fetchRecipients);

const page1: RecipientPage = {
  recipients: [{ id: 'u1', name: 'Aさん', imageUrl: '/a.png' }],
  nextCursor: 'C1',
};
const page2: RecipientPage = {
  recipients: [{ id: 'u2', name: 'Bさん', imageUrl: '/b.png' }],
  nextCursor: null,
};

describe('useRecipients', () => {
  beforeEach(() => {
    mockedFetchRecipients.mockReset();
  });

  it('初回に1ページ目を読み込み、次があればhasMoreを立てる', async () => {
    mockedFetchRecipients.mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useRecipients('me'));

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });
    expect(result.current.recipients).toEqual(page1.recipients);
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMoreで次ページを追記し、最終ページでhasMoreがfalseになる', async () => {
    mockedFetchRecipients
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const { result } = renderHook(() => useRecipients('me'));
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.recipients).toHaveLength(2);
    });
    expect(result.current.recipients.map((recipient) => recipient.id)).toEqual([
      'u1',
      'u2',
    ]);
    expect(result.current.hasMore).toBe(false);
    expect(mockedFetchRecipients).toHaveBeenCalledTimes(2);
  });

  it('取得に失敗したらerrorを設定する', async () => {
    mockedFetchRecipients.mockRejectedValueOnce(new Error('取得失敗'));

    const { result } = renderHook(() => useRecipients('me'));

    await waitFor(() => {
      expect(result.current.error).toBe('取得失敗');
    });
    expect(result.current.isLoadingInitial).toBe(false);
  });
});
