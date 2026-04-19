import WebSocket, { WebSocketServer } from 'ws';
import { wsArcjet } from '../arcjet.js';

function sendJson(socket,payload){
    if(socket.readyState !== WebSocket.OPEN){return}    //Gauid Function

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload){
    for(const client of wss.clients){
        sendJson(client, payload);
    }
}

export function attachWebSocketServer(server){
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024, // Avoids memory abuse and flooding 
    })
    // Perform Arcjet protection during the HTTP upgrade phase so denied clients
    // are rejected before the WebSocket handshake completes. If wsArcjet is not
    // configured (null) we skip protection.
    server.on('upgrade', async (req, socket, head) => {
        if (!wsArcjet) {
            // No protection configured; proceed with upgrade
            wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
            return;
        }

        try {
            const decision = await wsArcjet.protect(req);
            if (decision.isDenied()) {
                // Deny the upgrade with an HTTP response and close the socket.
                const status = decision.reason.isRateLimit() ? 429 : 403;
                const body = status === 429 ? 'Rate limit exceeded' : 'Forbidden';
                const res = `HTTP/1.1 ${status} ${status === 429 ? 'Too Many Requests' : 'Forbidden'}\r\n` +
                  'Content-Type: text/plain; charset=utf-8\r\n' +
                  `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n` +
                  '\r\n' +
                  body;
                try {
                  socket.write(res);
                } catch (writeErr) {
                  // ignore write errors
                }
                try { socket.destroy(); } catch (d) {}
                return;
            }

            // Allowed — proceed with the WebSocket upgrade
            wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
        } catch (e) {
            console.error('WS upgrade Arcjet error', e);
            // On error, close the socket with an internal error code
            try {
              socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\nService unavailable');
            } catch (writeErr) {}
            try { socket.destroy(); } catch (d) {}
        }
    });

    wss.on('connection', (socket, req) => {
        // Arcjet check already performed during upgrade; just welcome the client.
        sendJson(socket,{type: 'welcome'});
        socket.on('error', console.error);
    });

function broadcastMatchCreated(match){
    broadcast(wss, {type: 'match_created', data: match});
}
return {broadcastMatchCreated}
}