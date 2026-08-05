import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UserAvatar } from './UserAvatar';

const profileUrl = '/assets/profiles/human1.png';

describe('UserAvatar', () => {
  it('sizeを指定しなければ従来どおりmediumで表示する', () => {
    render(<UserAvatar name="山田 太郎" profileUrl={profileUrl} />);

    const image = screen.getByAltText('山田 太郎');

    expect(image).toHaveClass('h-12', 'w-12');
    expect(image).not.toHaveClass('h-16', 'w-16');
  });

  it('size="large"では大きいサイズで表示する', () => {
    render(
      <UserAvatar name="山田 太郎" profileUrl={profileUrl} size="large" />,
    );

    const image = screen.getByAltText('山田 太郎');

    expect(image).toHaveClass('h-16', 'w-16');
    expect(image).not.toHaveClass('h-12', 'w-12');
  });

  it('画像が無い場合はmediumの頭文字プレースホルダーにする', () => {
    render(<UserAvatar name="山田 太郎" />);

    const initial = screen.getByText('山');

    expect(initial).toHaveClass('h-12', 'w-12', 'text-lg');
  });

  it('size="large"で画像の読み込みに失敗しても、頭文字はlargeのまま表示する', () => {
    render(
      <UserAvatar name="山田 太郎" profileUrl={profileUrl} size="large" />,
    );

    fireEvent.error(screen.getByAltText('山田 太郎'));

    const initial = screen.getByText('山');

    expect(initial).toHaveClass('h-16', 'w-16', 'text-2xl');
    expect(screen.queryByAltText('山田 太郎')).not.toBeInTheDocument();
  });
});
