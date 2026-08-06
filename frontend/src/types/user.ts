export interface User {
  id: string;
  name: string;
  kozaBango: string;
  zandaka: number;
}

// 相手選択候補一覧APIのレスポンス想定（id・name・profileUrlのみ）。
// 送金・請求のいずれの相手選択導線でも共通で使う。
export interface Recipient {
  id: string;
  name: string;
  profileUrl?: string;
}

// 一覧に出る「相手」。取引履歴でも請求でも同じ形で扱う。
// Recipientと違い、APIが必ずprofileUrlを返す一覧で使う。
export interface Counterparty {
  /** 内部UUID（users.id）。 */
  id: string;
  /** 表示名。 */
  name: string;
  /** アイコン画像の相対URL（例: /assets/profiles/human1.png）。 */
  profileUrl: string;
}
