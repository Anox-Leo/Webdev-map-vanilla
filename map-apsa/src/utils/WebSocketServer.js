import * as http from 'http';
import { createHash } from 'crypto';

const localServer = 'ws://localhost:8080'; // You can use your local ip address if you want to access it from another local device

const ws = new WebSocket(localServer);
const users = [];

ws.onopen = function () {
    console.log('WebSocket connection opened');
}

ws.onerror = function () {
    console.error('Server not reachable, starting local server');
    startWebSocketServer();
}

function startWebSocketServer() {
    var server = http.createServer();
    console.log('Starting WebSocket server...');

    server.on('upgrade', function (req, socket) {
        var key = req.headers['sec-websocket-key'];
        if (!key) {
            socket.destroy();
            return;
        }
        var acceptKey = createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');

        socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            "Sec-WebSocket-Accept: ".concat(acceptKey, "\r\n") +
            '\r\n');

        let user = "user" + (users.length + 1);
        if (users.length === 0 || users[0].id !== "user1") {
            user = "user1";
        }
        users.push({id: user, isCurrent: true});
        createAndSendMessage(socket, users);

        socket.on('data', function (buffer) {
            try {
                var message = decodeWebSocketFrame(buffer);
                if (message == "status") {
                    for (let i = 0; i < users.length; i++) {
                        users[i].isCurrent = false;
                    }
                    createAndSendMessage(socket, users);
                } else if (message.includes("disconnected")) {
                    var user = message.split(" disconnected")[0];
                    users.splice(users.indexOf(users.find(u => u.id == user)), 1);
                }
            }
            catch (error) {
                console.error('Erreur de décodage:', error);
            }
        });
    });

    server.listen(8080, '0.0.0.0', function () {
        console.log('WebSocket server listening on ws://0.0.0.0:8080');
    });

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
        if (!maskBit)
            throw new Error("Message non masqué");

        var payloadLength = buffer[1] & 0x7F;
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

        return decoded.toString('utf8');
    }
}
