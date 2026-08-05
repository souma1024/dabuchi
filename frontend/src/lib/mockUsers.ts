import type { Recipient, User } from '../types/user';

// sample-app/src/db.json のユーザーデータを流用したモック。
export const currentUser: User = {
  id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
  name: '鈴木太郎',
  kozaBango: '1000000',
  zandaka: 80000,
};

// profileUrlはdatabase/seeds/development.sqlのprofile_url（/assets/profiles/human1〜6.png）の命名規則に合わせている。
export const recipients: Recipient[] = [
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
    name: '佐藤次郎',
    profileUrl: '/assets/profiles/human2.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf003',
    name: '佐藤三郎',
    profileUrl: '/assets/profiles/human3.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf004',
    name: '佐々木花子',
    profileUrl: '/assets/profiles/human4.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf005',
    name: '高橋洋子',
    profileUrl: '/assets/profiles/human5.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf006',
    name: '村上真子',
    profileUrl: '/assets/profiles/human6.png',
  },
];
