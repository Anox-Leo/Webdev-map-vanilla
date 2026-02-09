import { User, UserStatus } from "./User";

const statusLabels: Record<UserStatus, string> = {
  online: "En ligne",
  offline: "Hors ligne",
  busy: "Occupé",
  away: "Absent",
};

const statusColors: Record<UserStatus, string> = {
  online: "#22c55e",
  offline: "#6b7280",
  busy: "#ef4444",
  away: "#f59e0b",
};

export class UserContainer {
  private user: User;

  constructor(user: User) {
    this.user = user;
  }

  public render(): HTMLElement {
    const container = document.createElement("div");
    container.className = `user-container user-status-${this.user.status}`;

    // Point de couleur avec indicateur de statut
    const colorDot = document.createElement("span");
    colorDot.className = "user-color-dot";
    colorDot.style.backgroundColor = this.user.color || "#888";

    // Indicateur de statut
    const statusDot = document.createElement("span");
    statusDot.className = `user-status-indicator status-${this.user.status}`;
    statusDot.style.backgroundColor = statusColors[this.user.status];
    statusDot.title = statusLabels[this.user.status];

    // Nom de l'utilisateur
    const name = document.createElement("span");
    name.className = "user-name";
    name.textContent = this.user.name!;
    if (this.user.isCurrentUser) {
      name.textContent += " (vous)";
    }

    // Badge de statut
    const statusBadge = document.createElement("span");
    statusBadge.className = `user-status-badge status-${this.user.status}`;
    statusBadge.textContent = statusLabels[this.user.status];

    // Localisation
    const location = document.createElement("span");
    location.className = "user-location";
    if (this.user.position) {
      location.textContent = `(${this.user.position.x}, ${this.user.position.y})`;
    } else {
      location.textContent = "(localisation inconnue)";
    }

    const colorWrapper = document.createElement("div");
    colorWrapper.className = "user-color-wrapper";
    colorWrapper.appendChild(colorDot);
    colorWrapper.appendChild(statusDot);

    container.appendChild(colorWrapper);
    container.appendChild(name);
    container.appendChild(statusBadge);
    return container;
  }
}
