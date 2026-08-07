INSERT INTO users (id, user_id, balance, user_name, profile_url)
VALUES
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'), 'friend-001', 120000, '山田 太郎', '/assets/profiles/human1.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002'), 'friend-002', 85000, '佐藤 花子', '/assets/profiles/human2.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf003'), 'friend-003', 64000, '鈴木 一郎', '/assets/profiles/human3.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf004'), 'friend-004', 98000, '高橋 美咲', '/assets/profiles/human4.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf005'), 'friend-005', 73000, '田中 健太', '/assets/profiles/human5.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf006'), 'friend-006', 152000, '伊藤 結衣', '/assets/profiles/human6.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf007'), 'friend-007', 46000, '渡辺 翔太', '/assets/profiles/human1.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf008'), 'friend-008', 112000, '山本 葵', '/assets/profiles/human2.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf009'), 'friend-009', 57000, '中村 大輔', '/assets/profiles/human3.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf010'), 'friend-010', 91000, '小林 さくら', '/assets/profiles/human4.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf011'), 'friend-011', 68000, '加藤 遼', '/assets/profiles/human5.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf012'), 'friend-012', 134000, '吉田 愛', '/assets/profiles/human6.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf013'), 'friend-013', 39000, '山田 悠真', '/assets/profiles/human1.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf014'), 'friend-014', 105000, '佐々木 彩', '/assets/profiles/human2.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf015'), 'friend-015', 77000, '山口 直樹', '/assets/profiles/human3.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf016'), 'friend-016', 143000, '松本 琴音', '/assets/profiles/human4.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf017'), 'friend-017', 52000, '井上 陸', '/assets/profiles/human5.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf018'), 'friend-018', 88000, '木村 楓', '/assets/profiles/human6.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf019'), 'friend-019', 61000, '林 拓海', '/assets/profiles/human1.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf020'), 'friend-020', 127000, '斎藤 陽菜', '/assets/profiles/human2.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf021'), 'friend-021', 94000, '清水 海斗', '/assets/profiles/human3.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf022'), 'friend-022', 71000, '山崎 莉子', '/assets/profiles/human4.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf023'), 'friend-023', 116000, '森 蓮', '/assets/profiles/human5.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf024'), 'friend-024', 48000, '池田 美月', '/assets/profiles/human6.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf025'), 'friend-025', 83000, '橋本 蒼', '/assets/profiles/human1.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf026'), 'friend-026', 99000, '阿部 七海', '/assets/profiles/human2.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf027'), 'friend-027', 66000, '石川 湊', '/assets/profiles/human3.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf028'), 'friend-028', 138000, '山下 結菜', '/assets/profiles/human4.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf029'), 'friend-029', 55000, '中島 颯太', '/assets/profiles/human5.png'),
  (UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf030'), 'friend-030', 108000, '前田 心春', '/assets/profiles/human6.png')
ON DUPLICATE KEY UPDATE
  balance = VALUES(balance),
  user_name = VALUES(user_name),
  profile_url = VALUES(profile_url);


-- 開発用の共通パスワード。全シードユーザーが 'dabuchi-dev' でログインできる。
-- 開発環境のシードにしか入れないため、値が知られていても問題にならない。
-- 新規登録で作ったユーザーは自分のパスワードを持つので、ここでは上書きしない。
UPDATE users
   SET password_hash = 'scrypt$16384$8$1$MQx5e6w/ambN4+Z+GnLBQw==$BLkzG6EzapkORHNc3pqtQnLf3D5+b/gKBk77ZMxiuAc='
 WHERE user_id LIKE 'friend-%'
   AND password_hash IS NULL;


-- 取引履歴の「受取」表示を確認するための開発用データ。
-- アプリからは自分が送る取引しか作れず、他ユーザーから自分への送金を用意できないため、
-- MOCK_USER_ID既定のfriend-001宛の取引をシードで用意する。
-- 再実行しても増えないよう、idを固定してupsertする。
INSERT INTO transfers (id, sender_id, recipient_id, amount, created_at)
VALUES
  (
    9001,
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    5000,
    '2026-08-05 12:30:00.000000'
  ),
  (
    9002,
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf003'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    12000,
    '2026-08-04 19:05:00.000000'
  )
ON DUPLICATE KEY UPDATE
  sender_id = VALUES(sender_id),
  recipient_id = VALUES(recipient_id),
  amount = VALUES(amount),
  created_at = VALUES(created_at);


-- 送金・請求の相手候補は友達一覧から引くため、MOCK_USER_ID既定のfriend-001に友達を用意する。
-- 1ページ20件のページングを開発環境でも確認できるよう25人分を入れる。
-- 再実行しても増えないよう、idを固定してupsertする。
-- friendshipsはuser1_id < user2_idが制約のため、UUIDが最小のfriend-001を常にuser1へ置く。
INSERT INTO friendships (id, user1_id, user2_id, added_by_id, created_at)
VALUES
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000002'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:00.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000003'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf003'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:01.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000004'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf004'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:02.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000005'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf005'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:03.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000006'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf006'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:04.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000007'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf007'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:05.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000008'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf008'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:06.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000009'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf009'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:07.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000010'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf010'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:08.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000011'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf011'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:09.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000012'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf012'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:10.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000013'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf013'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:11.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000014'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf014'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:12.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000015'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf015'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:13.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000016'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf016'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:14.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000017'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf017'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:15.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000018'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf018'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:16.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000019'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf019'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:17.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000020'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf020'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:18.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000021'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf021'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:19.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000022'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf022'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:20.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000023'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf023'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:21.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000024'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf024'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:22.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000025'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf025'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:23.000000'
  ),
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000026'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf026'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '2026-08-06 09:00:24.000000'
  )
ON DUPLICATE KEY UPDATE
  added_by_id = VALUES(added_by_id),
  created_at = VALUES(created_at);


-- 友達詳細の自分用メモ表示を確認するための開発用データ。
INSERT INTO friendship_notes (friendship_id, user_id, message, created_at, updated_at)
VALUES
  (
    UUID_TO_BIN('7f000000-0000-4000-8000-000000000002'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    '大学の友人',
    '2026-08-06 09:30:00.000000',
    '2026-08-06 09:30:00.000000'
  )
ON DUPLICATE KEY UPDATE
  message = VALUES(message),
  created_at = VALUES(created_at),
  updated_at = VALUES(updated_at);


-- ブロックリスト画面を確認するための開発用データ。
-- ブロック中の友達は送金・請求の候補には出ず、ブロック一覧にだけ出る。
INSERT INTO user_blocks (blocker_id, blocked_user_id, created_at)
VALUES
  (
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf025'),
    '2026-08-06 10:00:00.000000'
  ),
  (
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001'),
    UUID_TO_BIN('5e5a4a1e-3b42-4f47-8b1f-b77ef98bf026'),
    '2026-08-06 10:05:00.000000'
  )
ON DUPLICATE KEY UPDATE
  created_at = VALUES(created_at);
