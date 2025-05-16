import { localServer } from "./localServer";
import { User } from "../components/users/User";

const users = [
    {
        "id": "user1",
        "name": "Léo",
        "color": "rgb(66,133,244)",
        "location": {
            "latitude": 388.88,
            "longitude": 735.08
        }
    },
    {
        "id": "user2",
        "name": "Zineddine",
        "color": "rgb(244,66,66)",
        "location": {
            "latitude": 160.585938,
            "longitude": 314.890625
        }
    },
    {
        "id": "user3",
        "name": "Youcef",
        "color": "rgb(244,244,66)",
        "location": {
            "latitude": 307.804688,
            "longitude": 416.132812
        }
    }
];

export class WebSocketClient {
    private static instance: WebSocketClient | null = null;
    private ws: WebSocket | null = null;
    private users: User[] = [];

    private constructor() {
        this.initWebSocketClient();
    }

    public static getInstance(): WebSocketClient {
        if (!WebSocketClient.instance) {
            WebSocketClient.instance = new WebSocketClient();
        }
        return WebSocketClient.instance;
    }

    public async getUsers(): Promise<User[]> {
        this.ws?.send('status');
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.users;
        
    }

    private initWebSocketClient(): void {
        this.ws = new WebSocket(localServer);

        window.addEventListener('beforeunload', () => {
        if (this.users.length > 0) {
            this.users.forEach((user) => {
                if (user.isCurrentUser) {
                    this.ws?.send(`${user.id} disconnected`);
                }
            });
        }

        this.ws?.close();
    });

        this.ws.onopen = () => {
            console.log('Connecté au serveur WebSocket');
        };

        this.ws.onmessage = (event) => {
            console.log(event.data);
            let newUsers = JSON.parse(event.data);
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
        };
    }

    private registerUser(userId: string): void {
        const user = users.find((user) => user.id === userId);
        if (user) {
            let isCurrentUser = false
            if (this.users.length == 0) {
                isCurrentUser = true
            }

            this.users.push({
                id: user.id,
                name: user.name,
                color: user.color,
                position: {
                    x: user.location.latitude,
                    y: user.location.longitude
                },
                isCurrentUser: isCurrentUser
            });
        }
    }

    private updateUserConnections(newUsers: any[]): void {
        if (newUsers.length > this.users.length) {
            for (let i = 0; i < newUsers.length; i++) {
                if (!this.users.map((user) => user.id).includes(newUsers[i].id)) {
                    this.registerUser(newUsers[i].id);
                }
            }
        } else {
            for (let i = 0; i < this.users.length; i++) {
                if (!newUsers.map((user) => user.id).includes(this.users[i].id)) {
                    this.users.splice(i, 1);
                }
            }
        }
    }
}

