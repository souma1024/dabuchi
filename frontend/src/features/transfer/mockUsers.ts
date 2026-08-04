import type { User } from './types';

// sample-app/src/db.json のユーザーデータを流用したモック。
export const currentUser: User = {
  id: '1',
  name: '鈴木太郎',
  kozaBango: '1000000',
  zandaka: 80000,
};

export const recipients: User[] = [
  { id: '2', name: '佐藤次郎', kozaBango: '2000000', zandaka: 50000 },
  { id: '3', name: '佐藤三郎', kozaBango: '3000000', zandaka: 33000 },
  { id: '4', name: '佐々木花子', kozaBango: '4000000', zandaka: 80000 },
  { id: '5', name: '高橋洋子', kozaBango: '5000000', zandaka: 80000 },
  { id: '6', name: '村上真子', kozaBango: '6000000', zandaka: 80000 },
];
