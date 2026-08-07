-- 決着済みの請求には responded_by を必須にする。
--
-- V6 では、列を追加した時点で動いていたアプリケーション（responded_by を書かない
-- 承認・拒否）を壊さないよう NULL を許していた。取り消しAPI（Issue #61）の投入で
-- 3操作すべてが responded_by を書くようになったため、ここで締める。
--
-- 列自体は NOT NULL にしない。pending のあいだは「まだ誰も終わらせていない」ことを
-- NULL で表す必要があるため。status ごとの条件付きCHECKで保証する。

-- 互換期間（V6適用から取り消しAPI投入まで）に確定した行を埋める。
-- その期間に請求を終わらせられたのは被請求者だけなので、V6のバックフィルと同じ推論。
UPDATE payment_requests
   SET responded_by = recipient_id
 WHERE status <> 'pending'
   AND responded_by IS NULL;

-- NULL を許す枝を落とすだけで、当事者の制限はV6から変えていない。
--
-- 各枝の IS NOT NULL は省略できない。responded_by が NULL のとき
-- `responded_by = recipient_id` は FALSE ではなく UNKNOWN になり、
-- CHECK は UNKNOWN を違反とみなさないため素通りしてしまう。
ALTER TABLE payment_requests
  DROP CHECK chk_payment_requests_responded_by,
  ADD CONSTRAINT chk_payment_requests_responded_by
    CHECK (
      -- 応答前は誰も終わらせていない。
      (status = 'pending' AND responded_by IS NULL)
      -- 承認できるのは被請求者だけ。請求者が自分の請求を承認することはありえない。
      OR (
        status = 'accepted'
        AND responded_by IS NOT NULL
        AND responded_by = recipient_id
      )
      -- rejectedは被請求者の拒否と請求者の取り消しの両方を表すため、双方を許す。
      OR (
        status = 'rejected'
        AND responded_by IS NOT NULL
        AND responded_by IN (requester_id, recipient_id)
      )
    );
