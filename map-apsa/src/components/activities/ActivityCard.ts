import {
  Activity,
  ActivityTypeLabels,
  ActivityTypeIcons,
  ActivityStatusLabels,
} from "./ActivityTypes";

export class ActivityCard {
  private activity: Activity;
  private element: HTMLElement | null = null;
  private joinHandler: ((activity: Activity) => void) | null = null;
  private leaveHandler: ((activity: Activity) => void) | null = null;
  private manageHandler: ((activity: Activity) => void) | null = null;
  private currentUserId: string;

  constructor(activity: Activity, currentUserId: string) {
    this.activity = activity;
    this.currentUserId = currentUserId;
  }

  public render(): HTMLElement {
    const card = document.createElement("div");
    card.className = `activity-card activity-status-${this.activity.status}`;
    card.setAttribute("data-id", this.activity.id);

    const isCreator = this.activity.creatorId === this.currentUserId;
    const isParticipant = this.activity.participants.some(
      (p) => p.id === this.currentUserId,
    );
    const isFull =
      this.activity.participants.length >= this.activity.maxParticipants;
    const canJoin =
      !isParticipant && !isFull && this.activity.status === "open";

    const scheduledDate = new Date(this.activity.scheduledDate);
    const dateStr = scheduledDate.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const participantsHtml = this.activity.participants
      .map(
        (p) => `
      <div class="participant-avatar" style="background-color: ${p.color}" title="${p.name}">
        ${p.name.charAt(0).toUpperCase()}
      </div>
    `,
      )
      .join("");

    const difficultyHtml = this.activity.difficulty
      ? `
      <span class="activity-difficulty difficulty-${this.activity.difficulty}">
        ${["", "Facile", "Modéré", "Difficile"][this.activity.difficulty]}
      </span>
    `
      : "";

    card.innerHTML = `
      <div class="activity-header">
        <span class="activity-type-icon">${ActivityTypeIcons[this.activity.type]}</span>
        <div class="activity-title-section">
          <h3 class="activity-name">${this.activity.name}</h3>
          <span class="activity-type">${ActivityTypeLabels[this.activity.type]}</span>
        </div>
        <span class="activity-status-badge status-${this.activity.status}">
          ${ActivityStatusLabels[this.activity.status]}
        </span>
      </div>
      
      <p class="activity-description">${this.activity.description}</p>
      
      <div class="activity-meta">
        <div class="activity-date">
          <span class="meta-icon">📅</span>
          <span>${dateStr}</span>
        </div>
        ${
          this.activity.distance
            ? `
          <div class="activity-distance">
            <span class="meta-icon">📏</span>
            <span>${this.activity.distance} km</span>
          </div>
        `
            : ""
        }
        ${difficultyHtml}
      </div>
      
      <div class="activity-participants-section">
        <div class="participants-header">
          <span class="participants-title">Participants</span>
          <span class="participants-count">${this.activity.participants.length}/${this.activity.maxParticipants}</span>
        </div>
        <div class="participants-avatars">
          ${participantsHtml}
          ${isFull ? "" : `<div class="participant-avatar participant-placeholder">+</div>`}
        </div>
      </div>
      
      <div class="activity-creator">
        <span>Organisé par <strong>${this.activity.creatorName}</strong></span>
      </div>
      
      <div class="activity-actions">
        ${canJoin ? `<button class="action-btn activity-join-btn">Rejoindre</button>` : ""}
        ${isParticipant && !isCreator ? `<button class="action-btn secondary activity-leave-btn">Quitter</button>` : ""}
        ${isCreator ? `<button class="action-btn secondary activity-manage-btn">Gérer</button>` : ""}
      </div>
    `;

    // Event listeners
    const joinBtn = card.querySelector(".activity-join-btn");
    if (joinBtn && this.joinHandler) {
      joinBtn.addEventListener("click", () => this.joinHandler!(this.activity));
    }

    const leaveBtn = card.querySelector(".activity-leave-btn");
    if (leaveBtn && this.leaveHandler) {
      leaveBtn.addEventListener("click", () =>
        this.leaveHandler!(this.activity),
      );
    }

    const manageBtn = card.querySelector(".activity-manage-btn");
    if (manageBtn && this.manageHandler) {
      manageBtn.addEventListener("click", () =>
        this.manageHandler!(this.activity),
      );
    }

    this.element = card;
    return card;
  }

  public setJoinHandler(handler: (activity: Activity) => void): void {
    this.joinHandler = handler;
  }

  public setLeaveHandler(handler: (activity: Activity) => void): void {
    this.leaveHandler = handler;
  }

  public setManageHandler(handler: (activity: Activity) => void): void {
    this.manageHandler = handler;
  }

  public getActivity(): Activity {
    return this.activity;
  }

  public getElement(): HTMLElement | null {
    return this.element;
  }
}
