-- 請求を終わらせた人。承認・拒否は被請求者、取り消しは請求者（Issue #61）。
-- status は pending / accepted / rejected の3値のままにし、rejected が「被請求者の拒否」と
-- 「請求者の取り消し」の両方を表す。どちらの操作だったかはこの列で区別する。
-- status に canceled を足す案より影響が小さく、後から区別できなくなる事態も避けられる。
--
-- NULL 許容: 列を足す前に確定した行と、取り消しAPI導入前のアプリケーションからの
-- 書き込みを許すため。pending のあいだは必ず NULL であることだけを制約で保証する。
--
-- 列の追加と、その列への制約追加は文を分ける。
-- TiDBは同じALTER内で追加したばかりの列を参照できず、column does not existで失敗する。
ALTER TABLE payment_requests
  ADD COLUMN responded_by BINARY(16) DEFAULT NULL;

ALTER TABLE payment_requests
  ADD CONSTRAINT fk_payment_requests_responded_by
    FOREIGN KEY (responded_by) REFERENCES users (id);

ALTER TABLE payment_requests
  ADD CONSTRAINT chk_payment_requests_responded_by
    CHECK (
      -- 応答前は誰も終わらせていない。
      (status = 'pending' AND responded_by IS NULL)
      -- 承認できるのは被請求者だけ。請求者が自分の請求を承認することはありえない。
      OR (
        status = 'accepted'
        AND (responded_by IS NULL OR responded_by = recipient_id)
      )
      -- rejectedは被請求者の拒否と請求者の取り消しの両方を表すため、双方を許す。
      OR (
        status = 'rejected'
        AND (
          responded_by IS NULL
          OR responded_by IN (requester_id, recipient_id)
        )
      )
    );

-- 既存の確定済みは被請求者で埋める。取り消しAPIが無い時点では、請求を終わらせられるのは
-- 被請求者だけだったため、accepted も rejected も操作者は被請求者で確定している。
UPDATE payment_requests
   SET responded_by = recipient_id
 WHERE status <> 'pending';
