import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PersonAvatar } from './PersonAvatar';

describe('PersonAvatar', () => {
  it('画像を表示し、識別は氏名テキストへ委ねるためaltは空にする', () => {
    const { container } = render(
      <PersonAvatar name="山田 太郎" imageUrl="/assets/profiles/human1.png" />,
    );

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/assets/profiles/human1.png');
    expect(image).toHaveAttribute('alt', '');
    // altが空なので、画像は読み上げ対象にならない。
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('画像の読み込みに失敗したら氏名の頭文字を代わりに出す', () => {
    const { container } = render(
      <PersonAvatar name="山田 太郎" imageUrl="/assets/profiles/broken.png" />,
    );

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('山')).toBeInTheDocument();
  });
});
