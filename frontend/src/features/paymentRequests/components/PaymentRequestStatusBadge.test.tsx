import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PaymentRequestStatusBadge } from './PaymentRequestStatusBadge';

describe('PaymentRequestStatusBadge', () => {
  // 同じstatusでも、請求された側か請求した側かで意味が変わる。
  it.each([
    ['received', 'pending', '未払い'],
    ['received', 'accepted', '支払済'],
    ['sent', 'pending', '請求中'],
    ['sent', 'accepted', '受取済'],
  ] as const)('%s の %s は「%s」', (direction, status, label) => {
    render(
      <PaymentRequestStatusBadge
        direction={direction}
        status={status}
        endedByMe={null}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // rejectedは拒否と取り下げの両方を表す。statusだけでは決められないため、
  // 誰が終わらせたか（endedByMe）と組み合わせて操作名を出す。
  // 拒否できるのは被請求者、取り下げられるのは請求者だけなので、
  // 操作名を出せば誰がやったかは一意に決まる。
  it.each([
    // 受けた請求で自分が終わらせた＝自分が拒否した
    ['received', true, '拒否'],
    // 受けた請求で相手が終わらせた＝相手が取り下げた
    ['received', false, '取り下げ'],
    // 出した請求で自分が終わらせた＝自分が取り下げた
    ['sent', true, '取り下げ'],
    // 出した請求で相手が終わらせた＝相手に拒否された
    ['sent', false, '拒否'],
  ] as const)(
    '%s で endedByMe=%s なら「%s」',
    (direction, endedByMe, label) => {
      render(
        <PaymentRequestStatusBadge
          direction={direction}
          status="rejected"
          endedByMe={endedByMe}
        />,
      );

      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  // 決着済みなら必ず入る（V8で必須化）が、欠けても画面が壊れないようにする。
  // 行為者を示さない言い方へ落とし、事実と食い違う表示は出さない。
  it('endedByMeが無ければ行為者を示さない言い方にする', () => {
    render(
      <PaymentRequestStatusBadge
        direction="sent"
        status="rejected"
        endedByMe={null}
      />,
    );

    expect(screen.getByText('キャンセル')).toBeInTheDocument();
  });
});
