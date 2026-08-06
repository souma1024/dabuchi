import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SortSelect } from './SortSelect';

const options = [
  { value: 'created-desc', label: '新しい順' },
  { value: 'created-asc', label: '古い順' },
  { value: 'name-asc', label: '名前順' },
] as const;

describe('SortSelect', () => {
  it('ラベルと選択肢を表示する', () => {
    render(
      <SortSelect
        value="created-desc"
        options={options}
        onChange={() => {}}
      />,
    );

    expect(screen.getByLabelText('並び替え')).toHaveValue('created-desc');
    expect(screen.getByRole('option', { name: '新しい順' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '古い順' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '名前順' })).toBeInTheDocument();
  });

  it('選択を変更すると value を通知する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SortSelect
        value="created-desc"
        options={options}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText('並び替え'), 'name-asc');

    expect(onChange).toHaveBeenCalledWith('name-asc');
  });

  it('label を上書きできる', () => {
    render(
      <SortSelect
        value="created-desc"
        options={options}
        onChange={() => {}}
        label="並び順"
      />,
    );

    expect(screen.getByLabelText('並び順')).toHaveValue('created-desc');
    expect(screen.queryByLabelText('並び替え')).not.toBeInTheDocument();
  });

  it('disabled のとき操作不可にする', () => {
    render(
      <SortSelect
        value="created-desc"
        options={options}
        onChange={() => {}}
        disabled
      />,
    );

    expect(screen.getByLabelText('並び替え')).toBeDisabled();
  });
});
