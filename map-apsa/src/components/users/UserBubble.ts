import './User.css';
import { UserList } from './UserList';
import { WebSocketClient } from '../../utils/WebSocketClient';

export class UserBubble {
    private bubble: HTMLElement;
    private userList: UserList | null = null;

    constructor() {
        this.bubble = document.createElement('div');
        this.bubble.className = 'user-bubble';

        // Titre
        const title = document.createElement('div');
        title.className = 'user-bubble-title';
        title.textContent = 'Utilisateurs connectés';
        this.bubble.appendChild(title);

        // Conteneur pour la liste
        const listContainer = document.createElement('div');
        listContainer.className = 'user-bubble-list';
        this.bubble.appendChild(listContainer);

        const mapContainer = document.getElementById('map-container');
        const mapControls = mapContainer?.querySelector('.map-controls');

        if (mapContainer && mapControls) {
            mapContainer.insertBefore(this.bubble, mapControls);
        } else {
            document.body.appendChild(this.bubble); // fallback
        }

        listContainer.innerHTML = '';
        this.userList = new UserList(listContainer, []);

        this.loadUsers(listContainer);
        setInterval(() => this.loadUsers(listContainer), 4000);
    }

    private async loadUsers(container: HTMLElement) {
        const webSocketClient = WebSocketClient.getInstance();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const users = await webSocketClient.getUsers();
        container.innerHTML = '';
        this.userList?.updateUsers(users);
    }
}