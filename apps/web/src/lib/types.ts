// Shapes returned by the SkillSwap API (apps/api).

export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  college: string | null;
  ratingAvg: number | null;
}

export interface UserBadge {
  earnedAt: string;
  badge: { id: string; name: string; criteria: string };
}

export interface Me {
  id: string;
  email: string;
  name: string;
  bio: string | null;
  college: string | null;
  avatarUrl: string | null;
  availability: string[];
  credits: number;
  ratingAvg: number | null;
  reviewCount: number;
  hasGoogleCalendar: boolean;
  googleCalendarAvailable: boolean;
  isAdmin: boolean;
  badges: UserBadge[];
}

export interface Skill {
  name: string;
  category: string;
}

export interface OfferedSkill extends Skill {
  skillId: string;
  proficiency: string;
}

export interface WantedSkill extends Skill {
  skillId: string;
}

export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ConnectionDirection = 'outgoing' | 'incoming';

export interface MatchSuggestion {
  userId: string;
  name: string;
  avatarUrl: string | null;
  college: string | null;
  bio: string | null;
  ratingAvg: number;
  reviewCount: number;
  completedSessions: number;
  offeredSkills: Skill[];
  wantedSkills: Skill[];
  matchId: string | null;
  connectionStatus: ConnectionStatus | null;
  connectionDirection: ConnectionDirection | null;
  isConnected: boolean;
  matchPercent: number;
  scoreBreakdown: {
    skill: number;
    availability: number;
    category: number;
    rating: number;
    experience: number;
  };
  sharedAvailability: string[];
  overlappingSkills: { wantedByMe: Skill[]; offeredByMe: Skill[] };
}

export interface ConnectionRequest {
  matchId: string;
  createdAt: string;
  user: UserSummary;
}

export interface ConnectionRequests {
  incoming: ConnectionRequest[];
  outgoing: ConnectionRequest[];
}

export interface Connection {
  matchId: string;
  user: UserSummary;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  nextSession: { id: string; scheduledAt: string; topic: string | null } | null;
  lastActivityAt: string;
}

export interface MatchDetail {
  matchId: string;
  status: ConnectionStatus;
  direction: ConnectionDirection;
  partner: UserSummary;
  swappableSkills: string[];
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface SessionReview {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  matchId: string;
  topic: string | null;
  notes: string | null;
  /** Set for a paid lesson; null for a skill swap. */
  teacherId: string | null;
  creditCost: number;
  /** Which side of a paid lesson the viewer is on; null for a skill swap. */
  role: 'teacher' | 'learner' | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string | null;
  googleHtmlLink: string | null;
  status: SessionStatus;
  partner: UserSummary;
  hasReviewed: boolean;
  reviews: SessionReview[];
}

export interface Overview {
  stats: {
    connections: number;
    pendingRequests: number;
    completedSessions: number;
    badges: number;
    credits: number;
    reviewCount: number;
    ratingAvg: number;
  };
  profile: {
    hasBio: boolean;
    offeredSkills: number;
    wantedSkills: number;
    availabilitySlots: number;
  };
  incomingRequests: ConnectionRequest[];
  upcomingSessions: Array<{
    id: string;
    topic: string | null;
    scheduledAt: string;
    durationMinutes: number;
    partner: UserSummary;
  }>;
}

export interface PublicProfile extends UserSummary {
  bio: string | null;
  availability: string[];
  createdAt: string;
  isMe: boolean;
  blockedByMe: boolean;
  reviewCount: number;
  completedSessions: number;
  offeredSkills: OfferedSkill[];
  wantedSkills: WantedSkill[];
  badges: UserBadge[];
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewer: { id: string; name: string; avatarUrl: string | null };
  }>;
  connection: {
    matchId: string;
    status: ConnectionStatus;
    direction: ConnectionDirection;
  } | null;
}

export interface LeaderboardUser extends UserSummary {
  ratingAvg: number;
  badgeCount: number;
  reviewCount: number;
  completedSessions: number;
}

export type CreditType =
  | 'SIGNUP_BONUS'
  | 'ACHIEVEMENT'
  | 'REVIEW_BONUS'
  | 'LESSON_HOLD'
  | 'LESSON_REFUND'
  | 'LESSON_EARNED'
  | 'REDEMPTION'
  | 'REDEMPTION_REFUND';

export interface CreditTransaction {
  id: string;
  /** Positive when received, negative when spent. */
  amount: number;
  type: CreditType;
  description: string;
  sessionId: string | null;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  /** Credits earned by teaching: the only ones that can be redeemed. */
  earnedTeaching: number;
  earnedBonuses: number;
  redeemable: number;
  /** Already deducted for lessons the viewer has booked. */
  held: number;
  /** Due to the viewer when lessons they teach are confirmed. */
  incoming: number;
  transactions: CreditTransaction[];
  rules: {
    minutesPerCredit: number;
    signupBonus: number;
    fiveStarReviewBonus: number;
    badgeBonuses: {
      firstSwap: number;
      verifiedSkill: number;
      mentor: number;
      topRated: number;
    };
  };
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  category: string;
  cost: number;
}

export interface Redemption {
  id: string;
  rewardId: string;
  title: string;
  cost: number;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  /** Set when fulfilled, e.g. the gift code or how to claim it. */
  note: string | null;
  createdAt: string;
}

export interface RewardsOverview {
  /** True while rewards are a preview and nothing is actually issued. */
  preview: boolean;
  balance: number;
  redeemable: number;
  catalog: Reward[];
  redemptions: Redemption[];
}

export type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'NO_SHOW' | 'OTHER';

export interface AdminPerson {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  suspendedAt: string | null;
}

export interface AdminSummary {
  users: number;
  suspendedUsers: number;
  openReports: number;
  pendingRedemptions: number;
}

export interface AdminReport {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reporter: AdminPerson;
  reported: AdminPerson & { _count: { reportsReceived: number } };
}

export interface AdminUser extends AdminPerson {
  credits: number;
  createdAt: string;
  reportCount: number;
  isAdmin: boolean;
}

export interface AdminRedemption extends Redemption {
  user: AdminPerson;
}
