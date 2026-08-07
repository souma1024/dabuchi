-- WARNING: This rollback relaxes the responded_by requirement back to the V6 form.
-- 決着済みの行に responded_by が無い状態を再び許す。埋めた値は消さないため、
-- 適用前の「どの行がNULLだったか」は復元できない。
ALTER TABLE payment_requests
  DROP CHECK chk_payment_requests_responded_by,
  ADD CONSTRAINT chk_payment_requests_responded_by
    CHECK (
      (status = 'pending' AND responded_by IS NULL)
      OR (
        status = 'accepted'
        AND (responded_by IS NULL OR responded_by = recipient_id)
      )
      OR (
        status = 'rejected'
        AND (
          responded_by IS NULL
          OR responded_by IN (requester_id, recipient_id)
        )
      )
    );
