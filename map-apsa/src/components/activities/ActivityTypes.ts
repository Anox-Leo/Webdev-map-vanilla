export type ActivityType =
  | "running"
  | "cycling"
  | "hiking"
  | "walking"
  | "swimming"
  | "other";

export type ActivityStatus = "open" | "in-progress" | "completed" | "cancelled";

export interface Activity {
  id: string;
  name: string;
  description: string;
  type: ActivityType;
  status: ActivityStatus;
  creatorId: string;
  creatorName: string;
  trailId?: string; // Lien optionnel avec un parcours existant
  participants: ActivityParticipant[];
  maxParticipants: number;
  scheduledDate: Date;
  createdAt: Date;
  distance?: number;
  difficulty?: 1 | 2 | 3;
}

export interface ActivityParticipant {
  id: string;
  name: string;
  color: string;
  status: "confirmed" | "pending" | "declined";
  joinedAt: Date;
}

export interface ActivityInvitation {
  activityId: string;
  userId: string;
  invitedBy: string;
  sentAt: Date;
  status: "pending" | "accepted" | "declined";
}

export const ActivityTypeLabels: Record<ActivityType, string> = {
  running: "Course à pied",
  cycling: "Vélo",
  hiking: "Randonnée",
  walking: "Marche",
  swimming: "Natation",
  other: "Autre",
};

export const ActivityTypeIcons: Record<ActivityType, string> = {
  running: "🏃",
  cycling: "🚴",
  hiking: "🥾",
  walking: "🚶",
  swimming: "🏊",
  other: "⭐",
};

export const ActivityStatusLabels: Record<ActivityStatus, string> = {
  open: "Ouvert aux inscriptions",
  "in-progress": "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};
