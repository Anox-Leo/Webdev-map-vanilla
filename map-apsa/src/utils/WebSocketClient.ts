import { localServer } from "./localServer";
import { User, UserStatus } from "../components/users/User";
import { Activity } from "../components/activities/ActivityTypes";

// Données utilisateurs prédéfinis
const PREDEFINED_USERS = [
  {
    id: "user1",
    name: "Léo",
    color: "rgb(66,133,244)",
    position: { x: 388.88, y: 735.08 },
  },
  {
    id: "user2",
    name: "Zineddine",
    color: "rgb(244,66,66)",
    position: { x: 160.585938, y: 314.890625 },
  },
  {
    id: "user3",
    name: "Alexis",
    color: "rgb(244,244,66)",
    position: { x: 307.804688, y: 416.132812 },
  },
];

export class WebSocketClient {
  private static instance: WebSocketClient | null = null;
  private ws: WebSocket | null = null;
  private socketId: number | null = null;
  private currentUserId: string | null = null;

  private users: User[] = [];
  private activities: Activity[] = [];

  private activityListeners: ((activities: Activity[]) => void)[] = [];
  private userListeners: ((users: User[]) => void)[] = [];

  // Gestion de l'inactivité
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly INACTIVITY_TIMEOUT = 40000; // 40 secondes
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 secondes
  private isAway = false;

  private constructor() {
    this.loadActivitiesFromStorage();
    this.initWebSocketClient();
    this.initActivityTracking();
  }

  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  // ==========================================
  // API publique
  // ==========================================

  public async getUsers(): Promise<User[]> {
    return this.users;
  }

  public getUsersSync(): User[] {
    return this.users;
  }

  public getCurrentUser(): User | undefined {
    return this.users.find((u) => u.isCurrentUser);
  }

  public async getActivities(): Promise<Activity[]> {
    return this.activities;
  }

  public updateUserStatus(userId: string, status: UserStatus): void {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.status = status;
      this.send({ type: "status_update", status });
      this.notifyUserListeners();
    }
  }

  public createActivity(activity: Activity): void {
    this.activities.push(activity);
    this.saveActivitiesToStorage();
    this.send({ type: "activity_create", activity });
    this.notifyActivityListeners();
  }

  public joinActivity(activityId: string, user: User): void {
    const activity = this.activities.find((a) => a.id === activityId);
    if (activity && !activity.participants.some((p) => p.id === user.id)) {
      activity.participants.push({
        id: user.id!,
        name: user.name!,
        color: user.color!,
        status: "confirmed",
        joinedAt: new Date(),
      });
      this.saveActivitiesToStorage();
      this.send({ type: "activity_join", activityId, userId: user.id });
      this.notifyActivityListeners();
    }
  }

  public leaveActivity(activityId: string, userId: string): void {
    const activity = this.activities.find((a) => a.id === activityId);
    if (activity) {
      activity.participants = activity.participants.filter(
        (p) => p.id !== userId,
      );
      this.saveActivitiesToStorage();
      this.send({ type: "activity_leave", activityId, userId });
      this.notifyActivityListeners();
    }
  }

  public updateActivity(updatedActivity: Activity): void {
    const index = this.activities.findIndex((a) => a.id === updatedActivity.id);
    if (index !== -1) {
      this.activities[index] = updatedActivity;
      this.saveActivitiesToStorage();
      this.send({ type: "activity_update", activity: updatedActivity });
      this.notifyActivityListeners();
    }
  }

  public deleteActivity(activityId: string): void {
    this.activities = this.activities.filter((a) => a.id !== activityId);
    this.saveActivitiesToStorage();
    this.send({ type: "activity_delete", activityId });
    this.notifyActivityListeners();
  }

  public onActivitiesUpdate(callback: (activities: Activity[]) => void): void {
    this.activityListeners.push(callback);
  }

  public onUsersUpdate(callback: (users: User[]) => void): void {
    this.userListeners.push(callback);
  }

  // ==========================================
  // WebSocket
  // ==========================================

  private initWebSocketClient(): void {
    console.log("Connexion au serveur WebSocket...");
    this.ws = new WebSocket(localServer);

    window.addEventListener("beforeunload", () => {
      this.stopHeartbeat();
      this.ws?.close();
    });

    this.ws.onopen = () => {
      console.log("Connecté au serveur WebSocket");
    };

    this.ws.onerror = (error) => {
      console.error("Erreur WebSocket:", error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket fermé, tentative de reconnexion dans 3s...");
      this.stopHeartbeat();
      this.socketId = null;

      // Mettre tous les utilisateurs offline sauf le current
      this.users.forEach((u) => {
        if (!u.isCurrentUser) {
          u.status = "offline";
        }
      });
      this.notifyUserListeners();

      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CLOSED) {
          this.initWebSocketClient();
        }
      }, 3000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        console.error("Erreur parsing message:", e);
      }
    };
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case "welcome":
        // Le serveur nous a attribué un socketId et la liste des users pris
        this.socketId = data.socketId;
        console.log(
          "Socket ID reçu:",
          this.socketId,
          "Users pris:",
          data.takenUserIds,
        );
        // S'enregistrer avec un userId disponible
        this.registerCurrentUser(data.takenUserIds || []);
        break;

      case "register_rejected":
        // L'utilisateur choisi est déjà pris, en choisir un autre
        console.log(
          "Enregistrement refusé, tentative avec un autre utilisateur",
        );
        this.registerCurrentUser(data.takenUserIds || []);
        break;

      case "state":
        // État global reçu du serveur
        this.handleStateUpdate(data);
        break;

      default:
        console.log("Message inconnu:", data.type);
    }
  }

  private registerCurrentUser(takenUserIds: string[]): void {
    // Trouver le premier utilisateur disponible
    const availableUsers = PREDEFINED_USERS.filter(
      (u) => !takenUserIds.includes(u.id),
    );

    if (availableUsers.length === 0) {
      console.error("Aucun utilisateur disponible !");
      return;
    }

    // Prendre le premier utilisateur disponible
    const userId = availableUsers[0].id;
    this.currentUserId = userId;

    // Créer l'utilisateur local
    const predefined = PREDEFINED_USERS.find((u) => u.id === userId);
    if (predefined) {
      // Vérifier si l'utilisateur existe déjà
      const existing = this.users.find((u) => u.id === userId);
      if (!existing) {
        this.users.push({
          id: predefined.id,
          name: predefined.name,
          color: predefined.color,
          position: predefined.position,
          isCurrentUser: true,
          status: "online",
          lastSeen: new Date(),
        });
      } else {
        existing.isCurrentUser = true;
        existing.status = "online";
      }
    }

    // Envoyer l'enregistrement au serveur
    this.send({ type: "register", userId });
    console.log("Enregistré comme:", userId);

    // Démarrer le heartbeat
    this.startHeartbeat();

    // Synchroniser les activités locales vers le serveur
    if (this.activities.length > 0) {
      this.send({ type: "sync_activities", activities: this.activities });
    }

    // Demander l'état actuel
    this.send({ type: "get_state" });

    this.notifyUserListeners();
  }

  private handleStateUpdate(data: {
    users: any[];
    activities: Activity[];
  }): void {
    // Mettre à jour les utilisateurs
    const serverUserIds = data.users.map((u) => u.id);

    // Ajouter/mettre à jour les utilisateurs connectés
    for (const serverUser of data.users) {
      const localUser = this.users.find((u) => u.id === serverUser.id);

      if (localUser) {
        // Mettre à jour le statut (sauf si c'est nous et qu'on a un statut "away")
        if (!localUser.isCurrentUser || !this.isAway) {
          localUser.status = serverUser.status || "online";
        }
      } else {
        // Ajouter l'utilisateur
        const predefined = PREDEFINED_USERS.find((u) => u.id === serverUser.id);
        if (predefined) {
          this.users.push({
            id: predefined.id,
            name: predefined.name,
            color: predefined.color,
            position: predefined.position,
            isCurrentUser: serverUser.id === this.currentUserId,
            status: serverUser.status || "online",
            lastSeen: new Date(),
          });
        }
      }
    }

    // Marquer les utilisateurs non présents comme offline
    for (const user of this.users) {
      if (!serverUserIds.includes(user.id) && !user.isCurrentUser) {
        user.status = "offline";
        user.lastSeen = new Date();
      }
    }

    // Mettre à jour les activités depuis le serveur
    if (data.activities !== undefined) {
      // Le serveur est la source de vérité pour les activités
      this.activities = [...data.activities];
      this.saveActivitiesToStorage();
      this.notifyActivityListeners();
    }

    this.notifyUserListeners();
  }

  private send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // ==========================================
  // Listeners
  // ==========================================

  private notifyActivityListeners(): void {
    this.activityListeners.forEach((cb) => cb(this.activities));
  }

  private notifyUserListeners(): void {
    this.userListeners.forEach((cb) => cb(this.users));
  }

  // ==========================================
  // Storage
  // ==========================================

  private saveActivitiesToStorage(): void {
    localStorage.setItem("map_activities", JSON.stringify(this.activities));
  }

  private loadActivitiesFromStorage(): void {
    const saved = localStorage.getItem("map_activities");
    if (saved) {
      try {
        this.activities = JSON.parse(saved);
      } catch {
        this.activities = [];
      }
    }
  }

  // ==========================================
  // Gestion de l'inactivité et du heartbeat
  // ==========================================

  private initActivityTracking(): void {
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((event) => {
      document.addEventListener(event, () => this.onUserActivity(), {
        passive: true,
      });
    });

    this.resetInactivityTimer();
  }

  private onUserActivity(): void {
    if (this.isAway) {
      this.isAway = false;
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.status === "away") {
        this.updateUserStatus(currentUser.id!, "online");
        console.log("Utilisateur de retour - statut: online");
      }
    }
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.onInactivityTimeout();
    }, this.INACTIVITY_TIMEOUT);
  }

  private onInactivityTimeout(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.status === "online") {
      this.isAway = true;
      this.updateUserStatus(currentUser.id!, "away");
      console.log("Inactivité détectée - statut: away");
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "heartbeat" });
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
