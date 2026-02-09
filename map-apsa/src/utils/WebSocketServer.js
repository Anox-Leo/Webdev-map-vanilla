import * as http from "http";
import { createHash } from "crypto";

// Configuration
const PORT = 8080;
const HEARTBEAT_TIMEOUT = 45000; // 45 secondes sans heartbeat = offline

// État global
const connectedClients = new Map(); // socketId -> { socket, userId, lastHeartbeat }
let activities = [];
let socketIdCounter = 0;

// Données utilisateurs prédéfinis
const USER_DATA = {
  user1: { name: "Léo", color: "rgb(66,133,244)" },
  user2: { name: "Alexis", color: "rgb(244,66,66)" },
  user3: { name: "Louis", color: "rgb(244,244,66)" },
};

console.log("Démarrage du serveur WebSocket...");
startWebSocketServer();

function startWebSocketServer() {
  const server = http.createServer();

  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        "Sec-WebSocket-Accept: " +
        acceptKey +
        "\r\n" +
        "\r\n",
    );

    // Créer un ID unique pour ce socket
    const socketId = ++socketIdCounter;
    connectedClients.set(socketId, {
      socket,
      userId: null, // Sera défini par le client via 'register'
      status: "online", // Statut par défaut
      lastHeartbeat: Date.now(),
    });

    console.log(`[Socket ${socketId}] Nouvelle connexion`);

    // Envoyer un message de bienvenue avec les utilisateurs déjà pris
    const takenUserIds = getTakenUserIds();
    sendToSocket(socket, { type: "welcome", socketId, takenUserIds });

    socket.on("data", (buffer) => {
      try {
        // Vérifier si c'est un frame de fermeture (opcode 0x08)
        const opcode = buffer[0] & 0x0f;
        if (opcode === 0x08) {
          console.log(`[Socket ${socketId}] Frame de fermeture reçu`);
          handleDisconnect(socketId);
          socket.end();
          return;
        }

        // Ignorer les frames ping/pong
        if (opcode === 0x09 || opcode === 0x0a) {
          return;
        }

        const message = decodeWebSocketFrame(buffer);
        if (!message || message.length === 0) return;

        const data = JSON.parse(message);
        handleMessage(socketId, data);
      } catch (error) {
        // Ne pas logger les erreurs de parsing pour les frames de contrôle
        if (!error.message.includes("JSON")) {
          console.error(`[Socket ${socketId}] Erreur:`, error.message);
        }
      }
    });

    socket.on("close", () => {
      handleDisconnect(socketId);
    });

    socket.on("error", (err) => {
      console.error(`[Socket ${socketId}] Erreur socket:`, err.message);
      handleDisconnect(socketId);
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur WebSocket en écoute sur ws://0.0.0.0:${PORT}`);
  });

  // Vérifier les heartbeats périodiquement
  setInterval(checkHeartbeats, 15000);
}

// ==========================================
// Gestion des messages
// ==========================================

function handleMessage(socketId, data) {
  const client = connectedClients.get(socketId);
  if (!client) return;

  // Mettre à jour le heartbeat à chaque message reçu
  client.lastHeartbeat = Date.now();

  switch (data.type) {
    case "register":
      handleRegister(socketId, data.userId);
      break;

    case "heartbeat":
      // Le heartbeat est géré par la mise à jour ci-dessus
      break;

    case "status_update":
      handleStatusUpdate(socketId, data.status);
      break;

    case "get_state":
      sendCurrentState(socketId);
      break;

    case "activity_create":
      activities.push(data.activity);
      console.log(
        `[Socket ${socketId}] Nouvelle activité: ${data.activity.name}`,
      );
      broadcastState();
      break;

    case "sync_activities":
      // Fusionner les activités du client avec celles du serveur
      if (data.activities && Array.isArray(data.activities)) {
        for (const clientActivity of data.activities) {
          const exists = activities.find((a) => a.id === clientActivity.id);
          if (!exists) {
            activities.push(clientActivity);
            console.log(
              `[Socket ${socketId}] Sync activité: ${clientActivity.name}`,
            );
          }
        }
      }
      break;

    case "activity_update":
      const actIndex = activities.findIndex((a) => a.id === data.activity.id);
      if (actIndex !== -1) {
        activities[actIndex] = data.activity;
      }
      broadcastState();
      break;

    case "activity_delete":
      activities = activities.filter((a) => a.id !== data.activityId);
      broadcastState();
      break;

    case "activity_join":
      handleActivityJoin(socketId, data.activityId, data.userId);
      break;

    case "activity_leave":
      handleActivityLeave(data.activityId, data.userId);
      break;

    default:
      console.log(`[Socket ${socketId}] Message inconnu:`, data.type);
  }
}

function getTakenUserIds() {
  const taken = [];
  for (const [, client] of connectedClients) {
    if (client.userId) {
      taken.push(client.userId);
    }
  }
  return taken;
}

function handleActivityJoin(socketId, activityId, userId) {
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) {
    console.log(`[Socket ${socketId}] Activité ${activityId} non trouvée`);
    return;
  }

  // Vérifier si l'utilisateur n'est pas déjà participant
  if (activity.participants.some((p) => p.id === userId)) {
    console.log(`[Socket ${socketId}] ${userId} déjà participant`);
    return;
  }

  // Vérifier si l'activité n'est pas pleine
  if (activity.participants.length >= activity.maxParticipants) {
    console.log(`[Socket ${socketId}] Activité pleine`);
    return;
  }

  // Ajouter le participant
  const userData = USER_DATA[userId];
  activity.participants.push({
    id: userId,
    name: userData?.name || userId,
    color: userData?.color || "rgb(128,128,128)",
    status: "confirmed",
    joinedAt: new Date().toISOString(),
  });

  console.log(
    `[Socket ${socketId}] ${userId} a rejoint l'activité ${activity.name}`,
  );
  broadcastState();
}

function handleActivityLeave(activityId, userId) {
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) return;

  activity.participants = activity.participants.filter((p) => p.id !== userId);
  console.log(`[${userId}] a quitté l'activité ${activity.name}`);
  broadcastState();
}

function handleRegister(socketId, userId) {
  const client = connectedClients.get(socketId);
  if (!client || !userId) return;

  // Vérifier si cet userId est déjà utilisé par un autre socket
  for (const [otherId, otherClient] of connectedClients) {
    if (otherId !== socketId && otherClient.userId === userId) {
      // Refuser l'enregistrement si l'utilisateur est déjà pris
      console.log(
        `[Socket ${socketId}] Refusé: ${userId} déjà utilisé par Socket ${otherId}`,
      );
      sendToSocket(client.socket, {
        type: "register_rejected",
        reason: "user_taken",
        takenUserIds: getTakenUserIds(),
      });
      return;
    }
  }

  client.userId = userId;
  console.log(
    `[Socket ${socketId}] Enregistré comme ${userId} (${USER_DATA[userId]?.name || userId})`,
  );

  // Envoyer l'état actuel à tous
  broadcastState();
}

function handleStatusUpdate(socketId, newStatus) {
  const client = connectedClients.get(socketId);
  if (!client || !client.userId) return;

  client.status = newStatus;
  console.log(`[${client.userId}] Statut: ${newStatus}`);
  broadcastState();
}

function handleDisconnect(socketId) {
  const client = connectedClients.get(socketId);
  if (!client) return;

  const userId = client.userId;
  connectedClients.delete(socketId);

  if (userId) {
    console.log(`[Socket ${socketId}] Déconnexion de ${userId}`);
  } else {
    console.log(`[Socket ${socketId}] Déconnexion (non enregistré)`);
  }

  // Informer les autres clients
  broadcastState();
}

function checkHeartbeats() {
  const now = Date.now();

  for (const [socketId, client] of connectedClients) {
    if (now - client.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.log(`[Socket ${socketId}] Heartbeat expiré`);
      handleDisconnect(socketId);
    }
  }
}

// ==========================================
// Envoi de l'état
// ==========================================

function getConnectedUsers() {
  const users = [];
  for (const [socketId, client] of connectedClients) {
    if (client.userId) {
      users.push({
        id: client.userId,
        status: client.status || "online",
      });
    }
  }
  return users;
}

function sendCurrentState(socketId) {
  const client = connectedClients.get(socketId);
  if (!client) return;

  const state = {
    type: "state",
    users: getConnectedUsers(),
    activities: activities,
  };

  sendToSocket(client.socket, state);
}

function broadcastState() {
  const state = {
    type: "state",
    users: getConnectedUsers(),
    activities: activities,
  };

  for (const [socketId, client] of connectedClients) {
    sendToSocket(client.socket, state);
  }
}

// ==========================================
// Utilitaires WebSocket
// ==========================================

function sendToSocket(socket, data) {
  try {
    const message = JSON.stringify(data);
    const length = Buffer.byteLength(message);

    let frame;
    if (length < 126) {
      frame = Buffer.alloc(2 + length);
      frame[0] = 0x81;
      frame[1] = length;
      frame.write(message, 2);
    } else if (length < 65536) {
      frame = Buffer.alloc(4 + length);
      frame[0] = 0x81;
      frame[1] = 126;
      frame.writeUInt16BE(length, 2);
      frame.write(message, 4);
    } else {
      console.error("Message trop long");
      return;
    }

    socket.write(frame);
  } catch (e) {
    console.error("Erreur envoi:", e.message);
  }
}

function decodeWebSocketFrame(buffer) {
  const maskBit = buffer[1] & 0x80;
  if (!maskBit) throw new Error("Message non masqué");

  let payloadLength = buffer[1] & 0x7f;
  let maskStart = 2;

  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(2);
    maskStart = 4;
  } else if (payloadLength === 127) {
    throw new Error("Payload trop long");
  }

  const mask = buffer.slice(maskStart, maskStart + 4);
  const payloadStart = maskStart + 4;
  const payload = buffer.slice(payloadStart, payloadStart + payloadLength);
  const decoded = Buffer.alloc(payloadLength);

  for (let i = 0; i < payloadLength; i++) {
    decoded[i] = payload[i] ^ mask[i % 4];
  }

  return decoded.toString("utf8");
}
