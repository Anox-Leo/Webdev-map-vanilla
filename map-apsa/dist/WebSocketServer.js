import * as http from "http";
import { createHash } from "crypto";

const localServer = "ws://localhost:8080"; // You can use your local ip address if you want to access it from another local device

const ws = new WebSocket(localServer);
const users = [];
let activities = [];
const connectedSockets = [];
const socketUserMap = new Map(); // Association socket <-> userId
const userLastHeartbeat = new Map(); // Dernier heartbeat par userId
const HEARTBEAT_TIMEOUT = 45000; // 45 secondes sans heartbeat = offline

ws.onopen = function () {
  console.log("WebSocket connection opened");
};

ws.onerror = function () {
  console.error("Server not reachable, starting local server");
  startWebSocketServer();
};

function startWebSocketServer() {
  var server = http.createServer();
  console.log("Starting WebSocket server...");

  server.on("upgrade", function (req, socket) {
    var key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.destroy();
      return;
    }
    var acceptKey = createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        "Sec-WebSocket-Accept: ".concat(acceptKey, "\r\n") +
        "\r\n",
    );

    // Trouver le prochain userId disponible (réutiliser les IDs des utilisateurs offline)
    let user = null;

    // Chercher un utilisateur offline à réactiver
    var offlineUser = users.find((u) => u.status === "offline");
    if (offlineUser) {
      user = offlineUser.id;
      offlineUser.status = "online";
      offlineUser.isCurrent = true;
    } else {
      // Sinon créer un nouvel utilisateur
      user = "user" + (users.length + 1);
      users.push({ id: user, isCurrent: true, status: "online" });
    }

    connectedSockets.push(socket);
    socketUserMap.set(socket, user); // Associer le socket à l'utilisateur
    userLastHeartbeat.set(user, Date.now()); // Initialiser le heartbeat
    console.log("Nouvel utilisateur connecté: " + user);
    createAndSendMessage(socket, users);

    socket.on("data", function (buffer) {
      try {
        var message = decodeWebSocketFrame(buffer);

        // Essayer de parser comme JSON pour les nouveaux messages
        try {
          var jsonMessage = JSON.parse(message);
          handleJsonMessage(socket, jsonMessage);
          return;
        } catch (e) {
          // Ce n'est pas du JSON, continuer avec l'ancien format
        }

        if (message == "status") {
          for (let i = 0; i < users.length; i++) {
            users[i].isCurrent = false;
          }
          createAndSendMessage(socket, users);
        } else if (message.includes("disconnected")) {
          var userId = message.split(" disconnected")[0];
          var userIndex = users.findIndex((u) => u.id == userId);
          if (userIndex !== -1) {
            users[userIndex].status = "offline";
            broadcastToAll({ type: "user_status", users: users });
          }
        }
      } catch (error) {
        console.error("Erreur de décodage:", error);
      }
    });

    socket.on("close", function () {
      var socketIndex = connectedSockets.indexOf(socket);
      if (socketIndex !== -1) {
        connectedSockets.splice(socketIndex, 1);
      }

      // Mettre l'utilisateur associé à ce socket en offline
      var userId = socketUserMap.get(socket);
      if (userId) {
        var userIndex = users.findIndex((u) => u.id === userId);
        if (userIndex !== -1) {
          users[userIndex].status = "offline";
          console.log(
            "Utilisateur " + userId + " déconnecté - statut: offline",
          );
          broadcastToAll({ type: "user_status", users: users });
        }
        socketUserMap.delete(socket);
        userLastHeartbeat.delete(userId);
      }
    });
  });

  server.listen(8080, "0.0.0.0", function () {
    console.log("WebSocket server listening on ws://0.0.0.0:8080");

    // Vérifier périodiquement les heartbeats expirés
    setInterval(function () {
      var now = Date.now();
      var hasChanges = false;

      userLastHeartbeat.forEach(function (lastHeartbeat, odataId) {
        if (now - lastHeartbeat > HEARTBEAT_TIMEOUT) {
          var userIndex = users.findIndex((u) => u.id === odataId);
          if (userIndex !== -1 && users[userIndex].status !== "offline") {
            users[userIndex].status = "offline";
            console.log(
              "Heartbeat expiré pour " + odataId + " - statut: offline",
            );
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        broadcastToAll({ type: "user_status", users: users });
      }
    }, 15000); // Vérifier toutes les 15 secondes
  });

  function handleJsonMessage(socket, message) {
    switch (message.type) {
      case "heartbeat":
        // Mettre à jour le dernier heartbeat de l'utilisateur
        if (message.userId) {
          var oldUserId = socketUserMap.get(socket);
          userLastHeartbeat.set(message.userId, Date.now());
          // Mettre à jour l'association socket <-> userId (le client connaît son vrai ID)
          socketUserMap.set(socket, message.userId);
          if (oldUserId !== message.userId) {
            console.log(
              "Association socket mise à jour: " +
                oldUserId +
                " -> " +
                message.userId,
            );
          }
          // S'assurer que l'utilisateur est marqué comme online s'il envoie un heartbeat
          var heartbeatUser = users.find((u) => u.id === message.userId);
          if (heartbeatUser && heartbeatUser.status === "offline") {
            heartbeatUser.status = "online";
            broadcastToAll({ type: "user_status", users: users });
          }
        }
        break;
      case "status_update":
        var user = users.find((u) => u.id === message.userId);
        if (user) {
          user.status = message.status;
          broadcastToAll({ type: "user_status", users: users });
        }
        break;
      case "activity_create":
        activities.push(message.activity);
        broadcastToAll({ type: "activities_update", activities: activities });
        break;
      case "activity_update":
        var activityIndex = activities.findIndex(
          (a) => a.id === message.activity.id,
        );
        if (activityIndex !== -1) {
          activities[activityIndex] = message.activity;
        }
        broadcastToAll({ type: "activities_update", activities: activities });
        break;
      case "activity_delete":
        activities = activities.filter((a) => a.id !== message.activityId);
        broadcastToAll({ type: "activities_update", activities: activities });
        break;
      case "activity_join":
        var activityJoin = activities.find((a) => a.id === message.activityId);
        if (activityJoin) {
          // Le participant est ajouté côté client, on synchronise juste
          broadcastToAll({ type: "activities_update", activities: activities });
        }
        break;
      case "activity_leave":
        var activityLeave = activities.find((a) => a.id === message.activityId);
        if (activityLeave) {
          activityLeave.participants = activityLeave.participants.filter(
            (p) => p.id !== message.userId,
          );
          broadcastToAll({ type: "activities_update", activities: activities });
        }
        break;
    }
  }

  function broadcastToAll(data) {
    var message = JSON.stringify(data);
    connectedSockets.forEach(function (socket) {
      try {
        var frame = Buffer.alloc(message.length + 2);
        frame[0] = 0x81;
        frame[1] = message.length;
        frame.write(message, 2);
        socket.write(frame);
      } catch (e) {
        console.error("Erreur broadcast:", e);
      }
    });
  }

  function createAndSendMessage(socket, users) {
    var message = JSON.stringify(users);
    var frame = Buffer.alloc(message.length + 2);
    frame[0] = 0x81;
    frame[1] = message?.length;
    frame.write(message, 2);
    socket.write(frame);
  }

  function decodeWebSocketFrame(buffer) {
    var maskBit = buffer[1] & 0x80;
    if (!maskBit) throw new Error("Message non masqué");

    var payloadLength = buffer[1] & 0x7f;
    var maskStart = 2;

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(2);
      maskStart = 4;
    } else if (payloadLength === 127) {
      throw new Error("Payload trop long pour cet exemple");
    }

    var mask = buffer.slice(maskStart, maskStart + 4);
    var payloadStart = maskStart + 4;
    var payload = buffer.slice(payloadStart, payloadStart + payloadLength);
    var decoded = Buffer.alloc(payloadLength);
    for (var i = 0; i < payloadLength; i++) {
      decoded[i] = payload[i] ^ mask[i % 4];
    }

    return decoded.toString("utf8");
  }
}
