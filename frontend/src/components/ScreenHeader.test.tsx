import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScreenHeader } from './ScreenHeader';

describe('ScreenHeader', () => {
  it('画面名を見出しとして表示する', () => {
    render(<ScreenHeader title="送金先" />);

    expect(screen.getByRole('heading', { name: '送金先' })).toBeInTheDocument();
  });

  it('onBackを渡すと戻るボタンから通知する', () => {
    const onBack = vi.fn();
    render(<ScreenHeader title="送金先" onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: '戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // 戻り先が無い画面（ホームなど）から使う場合を想定し、ボタン自体を出さない。
  it('onBackが未指定なら戻るボタンを表示しない', () => {
    render(<ScreenHeader title="送金先" />);

    expect(
      screen.queryByRole('button', { name: '戻る' }),
    ).not.toBeInTheDocument();
  });
});
