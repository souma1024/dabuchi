import type { TransferRecipient, User } from './types';

// sample-app/src/db.json のユーザーデータを流用したモック。
export const currentUser: User = {
  id: '1',
  name: '鈴木太郎',
  kozaBango: '1000000',
  zandaka: 80000,
};

// profileUrlはdatabase/seeds/development.sqlのprofile_url（/assets/profiles/human1〜6.png）の命名規則に合わせている。
export const recipients: TransferRecipient[] = [
  { id: '2', name: '佐藤次郎', profileUrl: '/assets/profiles/human2.png' },
  { id: '3', name: '佐藤三郎', profileUrl: '/assets/profiles/human3.png' },
  { id: '4', name: '佐々木花子', profileUrl: '/assets/profiles/human4.png' },
  { id: '5', name: '高橋洋子', profileUrl: '/assets/profiles/human5.png' },
  { id: '6', name: '村上真子', profileUrl: '/assets/profiles/human6.png' },
];
