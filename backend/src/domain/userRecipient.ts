export interface UserRecipient {
  id: string;
  name: string;
  profileUrl: string;
}

export interface UserRecipientRecord extends UserRecipient {
  createdAt: string;
}
