export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface Match {
  id: string;
  requesterId: string;
  providerId: string;
  skillId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  createdAt: Date;
}

export interface Session {
  id: string;
  matchId: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink?: string;
}

export interface Review {
  id: string;
  sessionId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}
