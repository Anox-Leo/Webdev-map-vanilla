import { Activity, ActivityType, ActivityTypeLabels } from "./ActivityTypes";
import { User } from "../users/User";
import { getTrails } from "../trails/TrailsData";
import { Trail } from "../trails/TrailCard";

export class ActivityCreator {
  private container: HTMLElement;
  private currentUser: User;
  private onlineUsers: User[] = [];
  private trails: Trail[] = [];
  private createHandler: ((activity: Activity) => void) | null = null;
  private cancelHandler: (() => void) | null = null;

  constructor(container: HTMLElement, currentUser: User, onlineUsers: User[]) {
    this.container = container;
    this.currentUser = currentUser;
    this.onlineUsers = onlineUsers.filter(
      (u) => u.id !== currentUser.id && u.status === "online",
    );
    this.loadTrailsAndRender();
  }

  private async loadTrailsAndRender(): Promise<void> {
    this.trails = await getTrails();
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";

    const form = document.createElement("div");
    form.className = "activity-creator";

    // Options de types d'activité
    const activityTypeOptions = Object.entries(ActivityTypeLabels)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");

    // Options de parcours existants
    const trailOptions = this.trails
      .map(
        (trail) =>
          `<option value="${trail.id}">${trail.name} (${trail.distance} km)</option>`,
      )
      .join("");

    // Liste des utilisateurs en ligne à inviter
    const onlineUsersHtml =
      this.onlineUsers.length > 0
        ? this.onlineUsers
            .map(
              (user) => `
          <label class="user-invite-option">
            <input type="checkbox" name="invite-user" value="${user.id}" />
            <span class="user-invite-dot" style="background-color: ${user.color}"></span>
            <span class="user-invite-name">${user.name}</span>
            <span class="user-invite-status status-${user.status}">${user.status}</span>
          </label>
        `,
            )
            .join("")
        : '<p class="no-users-message">Aucun autre utilisateur en ligne</p>';

    // Date par défaut : demain à 10h
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const defaultDateTime = tomorrow.toISOString().slice(0, 16);

    form.innerHTML = `
      <div class="creator-header">
        <h2>Créer une activité</h2>
        <button class="close-btn" id="cancel-create">&times;</button>
      </div>

      <form id="activity-form" class="activity-form">
        <div class="form-group">
          <label for="activity-name">Nom de l'activité *</label>
          <input type="text" id="activity-name" name="name" required 
                 placeholder="Ex: Course matinale à la Chantrerie" />
        </div>

        <div class="form-group">
          <label for="activity-type">Type d'activité *</label>
          <select id="activity-type" name="type" required>
            ${activityTypeOptions}
          </select>
        </div>

        <div class="form-group">
          <label for="activity-description">Description</label>
          <textarea id="activity-description" name="description" rows="3"
                    placeholder="Décrivez votre activité..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="activity-date">Date et heure *</label>
            <input type="datetime-local" id="activity-date" name="date" 
                   required value="${defaultDateTime}" />
          </div>

          <div class="form-group">
            <label for="activity-max">Participants max</label>
            <input type="number" id="activity-max" name="maxParticipants" 
                   min="2" max="50" value="10" />
          </div>
        </div>

        <div class="form-group">
          <label for="activity-trail">Associer à un parcours</label>
          <select id="activity-trail" name="trailId">
            <option value="">Aucun parcours</option>
            ${trailOptions}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="activity-distance">Distance (km)</label>
            <input type="number" id="activity-distance" name="distance" 
                   min="0" step="0.1" placeholder="Auto si parcours" />
          </div>

          <div class="form-group">
            <label for="activity-difficulty">Difficulté</label>
            <select id="activity-difficulty" name="difficulty">
              <option value="1">Facile</option>
              <option value="2">Modéré</option>
              <option value="3">Difficile</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Inviter des participants</label>
          <div class="users-invite-list">
            ${onlineUsersHtml}
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="action-btn secondary" id="cancel-btn">Annuler</button>
          <button type="submit" class="action-btn">Créer l'activité</button>
        </div>
      </form>
    `;

    this.container.appendChild(form);

    // Event listeners
    const formEl = document.getElementById("activity-form") as HTMLFormElement;
    formEl?.addEventListener("submit", (e) => this.handleSubmit(e));

    const cancelBtn = document.getElementById("cancel-btn");
    const cancelCreate = document.getElementById("cancel-create");
    cancelBtn?.addEventListener("click", () => this.cancelHandler?.());
    cancelCreate?.addEventListener("click", () => this.cancelHandler?.());

    // Auto-fill distance when trail is selected
    const trailSelect = document.getElementById(
      "activity-trail",
    ) as HTMLSelectElement;
    const distanceInput = document.getElementById(
      "activity-distance",
    ) as HTMLInputElement;
    const difficultySelect = document.getElementById(
      "activity-difficulty",
    ) as HTMLSelectElement;

    trailSelect?.addEventListener("change", () => {
      const selectedTrail = this.trails.find((t) => t.id === trailSelect.value);
      if (selectedTrail) {
        distanceInput.value = selectedTrail.distance.toString();
        difficultySelect.value = selectedTrail.difficulty.toString();
      }
    });
  }

  private handleSubmit(e: Event): void {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const invitedUserIds: string[] = [];
    form
      .querySelectorAll('input[name="invite-user"]:checked')
      .forEach((checkbox) => {
        invitedUserIds.push((checkbox as HTMLInputElement).value);
      });

    const activity: Activity = {
      id: `activity-${Date.now()}`,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || "",
      type: formData.get("type") as ActivityType,
      status: "open",
      creatorId: this.currentUser.id!,
      creatorName: this.currentUser.name!,
      trailId: (formData.get("trailId") as string) || undefined,
      participants: [
        {
          id: this.currentUser.id!,
          name: this.currentUser.name!,
          color: this.currentUser.color!,
          status: "confirmed",
          joinedAt: new Date(),
        },
      ],
      maxParticipants:
        parseInt(formData.get("maxParticipants") as string) || 10,
      scheduledDate: new Date(formData.get("date") as string),
      createdAt: new Date(),
      distance: parseFloat(formData.get("distance") as string) || undefined,
      difficulty:
        (parseInt(formData.get("difficulty") as string) as 1 | 2 | 3) ||
        undefined,
    };

    // Ajouter les utilisateurs invités comme participants en attente
    invitedUserIds.forEach((userId) => {
      const user = this.onlineUsers.find((u) => u.id === userId);
      if (user) {
        activity.participants.push({
          id: user.id!,
          name: user.name!,
          color: user.color!,
          status: "pending",
          joinedAt: new Date(),
        });
      }
    });

    this.createHandler?.(activity);
  }

  public setCreateHandler(handler: (activity: Activity) => void): void {
    this.createHandler = handler;
  }

  public setCancelHandler(handler: () => void): void {
    this.cancelHandler = handler;
  }
}
