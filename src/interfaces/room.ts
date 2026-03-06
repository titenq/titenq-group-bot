export interface Room {
  id: string;
  ownerId: number;
  participants: number[];
  createdAt: number;
  expiresAt: number;
}

export interface UserRateLimit {
  count: number;
  lastMessageAt: number;
}
