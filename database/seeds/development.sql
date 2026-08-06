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
