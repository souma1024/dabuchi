import human1 from '../../assets/icons/human1.png';
import human2 from '../../assets/icons/human2.png';
import human3 from '../../assets/icons/human3.png';
import human4 from '../../assets/icons/human4.png';
import human5 from '../../assets/icons/human5.png';
import human6 from '../../assets/icons/human6.png';
import type { User } from './types';

// sample-app/src/db.json のユーザーデータを流用したモック。
export const currentUser: User = {
  id: '1',
  name: '鈴木太郎',
  kozaBango: '1000000',
  zandaka: 80000,
  iconSrc: human1,
};

export const recipients: User[] = [
  {
    id: '2',
    name: '佐藤次郎',
    kozaBango: '2000000',
    zandaka: 50000,
    iconSrc: human2,
  },
  {
    id: '3',
    name: '佐藤三郎',
    kozaBango: '3000000',
    zandaka: 33000,
    iconSrc: human3,
  },
  {
    id: '4',
    name: '佐々木花子',
    kozaBango: '4000000',
    zandaka: 80000,
    iconSrc: human4,
  },
  {
    id: '5',
    name: '高橋洋子',
    kozaBango: '5000000',
    zandaka: 80000,
    iconSrc: human5,
  },
  {
    id: '6',
    name: '村上真子',
    kozaBango: '6000000',
    zandaka: 80000,
    iconSrc: human6,
  },
];
