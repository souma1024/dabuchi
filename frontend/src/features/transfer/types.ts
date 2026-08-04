export interface User {
  id: string;
  name: string;
  kozaBango: string;
  zandaka: number;
}

// 送金相手候補一覧APIのレスポンス想定（id・name・profileUrlのみ）。
export interface TransferRecipient {
  id: string;
  name: string;
  profileUrl?: string;
}
