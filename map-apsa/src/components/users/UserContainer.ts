import { User } from "./User";

export class UserContainer {
  private user: User;

  constructor(user: User) {
    this.user = user;
  }

  public render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'user-container';

    // Point de couleur
    const colorDot = document.createElement('span');
    colorDot.className = 'user-color-dot';
    colorDot.style.backgroundColor = this.user.color || '#888';

    // Nom de l'utilisateur
    const name = document.createElement('span');
    name.className = 'user-name';
    name.textContent = this.user.name!;
    if (this.user.isCurrentUser) {
      name.textContent += ' (vous)';
    }

    // Localisation
    const location = document.createElement('span');
    location.className = 'user-location';
    if (this.user.position) {
      location.textContent = `(${this.user.position.x}, ${this.user.position.y})`;
    } else {
      location.textContent = '(localisation inconnue)';
    }

    container.appendChild(colorDot);
    container.appendChild(name);
    return container;
  }
}