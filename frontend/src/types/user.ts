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
