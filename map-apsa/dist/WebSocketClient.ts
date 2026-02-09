import { localServer } from "./localServer";
import { User, UserStatus } from "../components/users/User";
import { Activity } from "../components/activities/ActivityTypes";

const users = [
  {
    id: "user1",
    name: "Léo",
    color: "rgb(66,133,244)",
    location: {
      latitude: 388.88,
      longitude: 735.08,
    },
    status: "online",
  },
  {
    id: "user2",
    name: "Zineddine",
    color: "rgb(244,66,66)",
    location: {
      latitude: 160.585938,
      longitude: 314.890625,
    },
    status: "online",
  },
  {
    id: "user3",
    name: "Alexis",
    color: "rgb(244,244,66)",
    location: {
      latitude: 307.804688,
      longitude: 416.132812,
    },
    status: "online",
  },
];

export class WebSocketClient {
  private static instance: WebSocketClient | null = null;
  private ws: WebSocket | null = null;
  private users: User[] = [];
  private activities: Activity[] = [];
  private activityListeners: ((activities: Activity[]) => void)[] = [];
  private userListeners: ((users: User[]) => void)[] = [];

  // Gestion de l'inactivité
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly INACTIVITY_TIMEOUT = 60000; // 1 minute
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 secondes
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

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const maxAttempts = 50; // 5 seconds max
      let attempts = 0;

      const checkConnection = setInterval(() => {
        attempts++;
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearInterval(checkConnection);
          resolve();
        } else if (
          attempts >= maxAttempts ||
          this.ws?.readyState === WebSocket.CLOSED
        ) {
          clearInterval(checkConnection);
          reject(new Error("WebSocket connection failed"));
        }
      }, 100);
    });
  }

  public async getUsers(): Promise<User[]> {
    try {
      await this.waitForConnection();
      this.ws?.send("status");
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.users;
    } catch (error) {
      console.warn("WebSocket not connected, returning cached users");
      return this.users;
    }
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
      this.ws?.send(JSON.stringify({ type: "status_update", userId, status }));
      this.notifyUserListeners();
    }
  }

  public createActivity(activity: Activity): void {
    this.activities.push(activity);
    this.saveActivitiesToStorage();
    this.ws?.send(JSON.stringify({ type: "activity_create", activity }));
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
      this.ws?.send(
        JSON.stringify({ type: "activity_join", activityId, userId: user.id }),
      );
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
      this.ws?.send(
        JSON.stringify({ type: "activity_leave", activityId, userId }),
      );
      this.notifyActivityListeners();
    }
  }

  public updateActivity(updatedActivity: Activity): void {
    const index = this.activities.findIndex((a) => a.id === updatedActivity.id);
    if (index !== -1) {
      this.activities[index] = updatedActivity;
      this.saveActivitiesToStorage();
      this.ws?.send(
        JSON.stringify({ type: "activity_update", activity: updatedActivity }),
      );
      this.notifyActivityListeners();
    }
  }

  public deleteActivity(activityId: string): void {
    this.activities = this.activities.filter((a) => a.id !== activityId);
    this.saveActivitiesToStorage();
    this.ws?.send(JSON.stringify({ type: "activity_delete", activityId }));
    this.notifyActivityListeners();
  }

  public onActivitiesUpdate(callback: (activities: Activity[]) => void): void {
    this.activityListeners.push(callback);
  }

  public onUsersUpdate(callback: (users: User[]) => void): void {
    this.userListeners.push(callback);
  }

  private notifyActivityListeners(): void {
    this.activityListeners.forEach((cb) => cb(this.activities));
  }

  private notifyUserListeners(): void {
    this.userListeners.forEach((cb) => cb(this.users));
  }

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

  private initWebSocketClient(): void {
    this.ws = new WebSocket(localServer);

    window.addEventListener("beforeunload", () => {
      if (this.users.length > 0) {
        this.users.forEach((user) => {
          if (user.isCurrentUser) {
            this.ws?.send(`${user.id} disconnected`);
          }
        });
      }
      this.stopHeartbeat();
      this.ws?.close();
    });

    this.ws.onopen = () => {
      console.log("Connecté au serveur WebSocket");
      this.startHeartbeat();
      // Envoyer un heartbeat immédiatement pour s'identifier auprès du serveur
      setTimeout(() => {
        const currentUser = this.getCurrentUser();
        if (currentUser && this.ws?.readyState === WebSocket.OPEN) {
          console.log("Envoi heartbeat initial pour:", currentUser.id);
          this.ws.send(
            JSON.stringify({
              type: "heartbeat",
              userId: currentUser.id,
              timestamp: Date.now(),
            }),
          );
        }
      }, 500); // Petit délai pour laisser le temps à l'enregistrement de l'utilisateur
    };

    this.ws.onerror = (error) => {
      console.error("Erreur WebSocket:", error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket fermé, tentative de reconnexion...");
      this.stopHeartbeat();

      // Mettre le statut de l'utilisateur courant à offline localement
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        currentUser.status = "offline";
        this.notifyUserListeners();
      }

      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CLOSED) {
          this.initWebSocketClient();
        }
      }, 3000);
    };

    this.ws.onmessage = (event) => {
      console.log("Message reçu:", event.data);
      try {
        let data = JSON.parse(event.data);

        // Gérer les messages de type objet avec un type spécifique
        if (data.type) {
          switch (data.type) {
            case "activities_update":
              this.handleActivitiesUpdate(data.activities);
              return;
            case "user_status":
              this.handleUserStatusUpdate(data.users);
              return;
          }
        }

        // Ancien format : tableau d'utilisateurs
        if (Array.isArray(data)) {
          this.handleUsersMessage(data);
        }
      } catch (e) {
        console.error("Erreur parsing message:", e);
      }
    };
  }

  private handleActivitiesUpdate(activities: Activity[]): void {
    // Fusionner les activités reçues avec les locales (priorité au serveur)
    const serverIds = activities.map((a) => a.id);
    const localOnly = this.activities.filter((a) => !serverIds.includes(a.id));
    this.activities = [...activities, ...localOnly];
    this.saveActivitiesToStorage();
    this.notifyActivityListeners();
  }

  private handleUserStatusUpdate(serverUsers: any[]): void {
    console.log("Mise à jour statuts reçue:", serverUsers);
    for (const serverUser of serverUsers) {
      const localUser = this.users.find((u) => u.id === serverUser.id);
      if (localUser) {
        console.log(
          `Statut ${localUser.name} (${localUser.id}): ${localUser.status} -> ${serverUser.status}`,
        );
        localUser.status = serverUser.status;
      }
    }
    this.notifyUserListeners();
  }

  private handleUsersMessage(newUsers: any[]): void {
    let currentUser = "";
    for (let i = 0; i < newUsers.length; i++) {
      if (newUsers[i].isCurrent) {
        currentUser = newUsers[i].id;
        break;
      }
    }
    if (currentUser) {
      this.ws?.send(`${currentUser} is connected`);
      this.registerUser(currentUser);
    } else {
      this.updateUserConnections(newUsers);
    }
  }

  private registerUser(userId: string): void {
    const user = users.find((user) => user.id === userId);
    if (user) {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = this.users.find((u) => u.id === userId);
      if (existingUser) {
        // Mettre à jour le statut de l'utilisateur existant
        existingUser.status = "online";
        this.notifyUserListeners();
        return;
      }

      let isCurrentUser = false;
      if (this.users.length == 0) {
        isCurrentUser = true;
      }

      this.users.push({
        id: user.id,
        name: user.name,
        color: user.color,
        position: {
          x: user.location.latitude,
          y: user.location.longitude,
        },
        isCurrentUser: isCurrentUser,
        status: "online",
        lastSeen: new Date(),
      });
      this.notifyUserListeners();
    }
  }

  private updateUserConnections(newUsers: any[]): void {
    // Ajouter les nouveaux utilisateurs (sans doublons)
    for (let i = 0; i < newUsers.length; i++) {
      const existingUser = this.users.find((u) => u.id === newUsers[i].id);
      if (!existingUser) {
        this.registerUser(newUsers[i].id);
      } else {
        // Mettre à jour le statut de l'utilisateur existant
        existingUser.status = newUsers[i].status || "online";
      }
    }

    // Marquer les utilisateurs absents comme offline
    for (let i = 0; i < this.users.length; i++) {
      if (!newUsers.map((user) => user.id).includes(this.users[i].id)) {
        this.users[i].status = "offline";
        this.users[i].lastSeen = new Date();
      }
    }
    this.notifyUserListeners();
  }

  // ==========================================
  // Gestion de l'inactivité et du heartbeat
  // ==========================================

  private initActivityTracking(): void {
    // Écouter les événements d'activité utilisateur
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

    // Démarrer le timer d'inactivité
    this.resetInactivityTimer();
  }

  private onUserActivity(): void {
    // Si l'utilisateur était "away", le remettre "online"
    if (this.isAway) {
      this.isAway = false;
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.status === "away") {
        this.updateUserStatus(currentUser.id!, "online");
        console.log("Utilisateur de retour - statut: online");
      }
    }

    // Réinitialiser le timer d'inactivité
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    // Annuler le timer existant
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Démarrer un nouveau timer
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
    this.stopHeartbeat(); // S'assurer qu'il n'y a pas de heartbeat en cours

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          this.ws.send(
            JSON.stringify({
              type: "heartbeat",
              userId: currentUser.id,
              timestamp: Date.now(),
            }),
          );
        }
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
