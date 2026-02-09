import {
  Activity,
  ActivityStatus,
  ActivityStatusLabels,
  ActivityTypeIcons,
} from "./ActivityTypes";
import { WebSocketClient } from "../../utils/WebSocketClient";

export class ActivityManager {
  private activity: Activity;
  private container: HTMLElement;
  private wsClient: WebSocketClient;
  private onClose: () => void;
  private onUpdate: (activity: Activity) => void;

  constructor(
    activity: Activity,
    container: HTMLElement,
    onClose: () => void,
    onUpdate: (activity: Activity) => void,
  ) {
    this.activity = activity;
    this.container = container;
    this.wsClient = WebSocketClient.getInstance();
    this.onClose = onClose;
    this.onUpdate = onUpdate;
  }

  public render(): void {
    const overlay = document.createElement("div");
    overlay.className = "activity-manager-overlay";

    const modal = document.createElement("div");
    modal.className = "activity-manager-modal";

    const scheduledDate = new Date(this.activity.scheduledDate);
    const dateStr = scheduledDate.toISOString().slice(0, 16);

    modal.innerHTML = `
      <div class="manager-header">
        <h2>
          <span class="activity-type-icon">${ActivityTypeIcons[this.activity.type]}</span>
          Gérer: ${this.activity.name}
        </h2>
        <button class="close-btn">&times;</button>
      </div>

      <div class="manager-content">
        <div class="manager-section">
          <h3>📝 Informations</h3>
          <div class="form-group">
            <label>Nom de l'activité</label>
            <input type="text" id="activity-name" value="${this.activity.name}" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="activity-description">${this.activity.description}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date et heure</label>
              <input type="datetime-local" id="activity-date" value="${dateStr}" />
            </div>
            <div class="form-group">
              <label>Participants max</label>
              <input type="number" id="activity-max" value="${this.activity.maxParticipants}" min="2" max="50" />
            </div>
          </div>
        </div>

        <div class="manager-section">
          <h3>🎯 Statut de l'activité</h3>
          <div class="status-buttons">
            ${this.renderStatusButtons()}
          </div>
        </div>

        <div class="manager-section">
          <h3>👥 Participants (${this.activity.participants.length}/${this.activity.maxParticipants})</h3>
          <div class="participants-list">
            ${this.renderParticipants()}
          </div>
        </div>
      </div>

      <div class="manager-footer">
        <button class="action-btn secondary cancel-btn">Annuler</button>
        <button class="action-btn danger delete-btn">🗑️ Supprimer l'activité</button>
        <button class="action-btn save-btn">💾 Enregistrer</button>
      </div>
    `;

    overlay.appendChild(modal);
    this.container.appendChild(overlay);

    // Event listeners
    overlay
      .querySelector(".close-btn")
      ?.addEventListener("click", () => this.close(overlay));
    overlay
      .querySelector(".cancel-btn")
      ?.addEventListener("click", () => this.close(overlay));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.close(overlay);
    });

    overlay
      .querySelector(".save-btn")
      ?.addEventListener("click", () => this.save(overlay));
    overlay
      .querySelector(".delete-btn")
      ?.addEventListener("click", () => this.delete(overlay));

    // Status buttons
    overlay.querySelectorAll(".status-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const status = target.dataset.status as ActivityStatus;
        overlay
          .querySelectorAll(".status-btn")
          .forEach((b) => b.classList.remove("active"));
        target.classList.add("active");
        this.activity.status = status;
      });
    });

    // Remove participant buttons
    overlay.querySelectorAll(".remove-participant-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const participantId = target.dataset.participantId;
        if (participantId && participantId !== this.activity.creatorId) {
          this.removeParticipant(participantId, overlay);
        }
      });
    });
  }

  private renderStatusButtons(): string {
    const statuses: ActivityStatus[] = [
      "open",
      "in-progress",
      "completed",
      "cancelled",
    ];
    return statuses
      .map(
        (status) => `
      <button class="status-btn status-${status} ${this.activity.status === status ? "active" : ""}" 
              data-status="${status}">
        ${this.getStatusIcon(status)} ${ActivityStatusLabels[status]}
      </button>
    `,
      )
      .join("");
  }

  private getStatusIcon(status: ActivityStatus): string {
    const icons: Record<ActivityStatus, string> = {
      open: "✅",
      "in-progress": "🔄",
      completed: "✔️",
      cancelled: "❌",
    };
    return icons[status];
  }

  private renderParticipants(): string {
    if (this.activity.participants.length === 0) {
      return '<p class="no-participants">Aucun participant pour le moment</p>';
    }

    // Récupérer les statuts des utilisateurs connectés
    const connectedUsers = this.wsClient.getUsersSync();

    return this.activity.participants
      .map((p) => {
        const isCreator = p.id === this.activity.creatorId;
        const joinedDate = new Date(p.joinedAt).toLocaleDateString("fr-FR");

        // Trouver le statut de l'utilisateur
        const user = connectedUsers.find((u) => u.id === p.id);
        const status = user?.status || "offline";
        const statusIcon = this.getParticipantStatusIcon(status);
        const statusLabel = this.getParticipantStatusLabel(status);

        return `
        <div class="participant-item">
          <div class="participant-avatar" style="background-color: ${p.color}">
            ${p.name.charAt(0).toUpperCase()}
            <span class="participant-status-indicator status-${status}" title="${statusLabel}"></span>
          </div>
          <div class="participant-info">
            <span class="participant-name">
              ${p.name} ${isCreator ? '<span class="creator-badge">Organisateur</span>' : ""}
              <span class="participant-status-text status-${status}">${statusIcon} ${statusLabel}</span>
            </span>
            <span class="participant-joined">Inscrit le ${joinedDate}</span>
          </div>
          ${
            !isCreator
              ? `<button class="remove-participant-btn" data-participant-id="${p.id}" title="Retirer">
              ❌
            </button>`
              : ""
          }
        </div>
      `;
      })
      .join("");
  }

  private getParticipantStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      online: "🟢",
      away: "🟡",
      offline: "⚫",
    };
    return icons[status] || "⚫";
  }

  private getParticipantStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      online: "En ligne",
      away: "Absent",
      offline: "Hors ligne",
    };
    return labels[status] || "Hors ligne";
  }

  private removeParticipant(participantId: string, overlay: HTMLElement): void {
    this.activity.participants = this.activity.participants.filter(
      (p) => p.id !== participantId,
    );
    this.wsClient.leaveActivity(this.activity.id, participantId);

    // Refresh the participants list
    const participantsList = overlay.querySelector(".participants-list");
    if (participantsList) {
      participantsList.innerHTML = this.renderParticipants();
      // Re-attach event listeners
      participantsList
        .querySelectorAll(".remove-participant-btn")
        .forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const target = e.currentTarget as HTMLElement;
            const pId = target.dataset.participantId;
            if (pId && pId !== this.activity.creatorId) {
              this.removeParticipant(pId, overlay);
            }
          });
        });
    }

    // Update header count
    const header = overlay.querySelector(".manager-section h3");
    if (header && header.textContent?.includes("Participants")) {
      header.innerHTML = `👥 Participants (${this.activity.participants.length}/${this.activity.maxParticipants})`;
    }
  }

  private save(overlay: HTMLElement): void {
    const nameInput = overlay.querySelector(
      "#activity-name",
    ) as HTMLInputElement;
    const descInput = overlay.querySelector(
      "#activity-description",
    ) as HTMLTextAreaElement;
    const dateInput = overlay.querySelector(
      "#activity-date",
    ) as HTMLInputElement;
    const maxInput = overlay.querySelector("#activity-max") as HTMLInputElement;

    if (nameInput && descInput && dateInput && maxInput) {
      this.activity.name = nameInput.value;
      this.activity.description = descInput.value;
      this.activity.scheduledDate = new Date(dateInput.value);
      this.activity.maxParticipants = parseInt(maxInput.value, 10);
    }

    this.wsClient.updateActivity(this.activity);
    this.onUpdate(this.activity);
    this.close(overlay);
  }

  private delete(overlay: HTMLElement): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette activité ?")) {
      this.wsClient.deleteActivity(this.activity.id);
      this.close(overlay);
    }
  }

  private close(overlay: HTMLElement): void {
    overlay.remove();
    this.onClose();
  }
}
