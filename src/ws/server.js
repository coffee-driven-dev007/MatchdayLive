import WebSocket, { WebSocketServer } from 'ws';
import { wsArcjet } from '../arcjet.js';

const matchSubscribers = new Map(); // matchId -> Set of WebSocket clients

function subscribe(matchId,socket){
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket){
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers){return}

    subscribers.delete(socket);

    if(subscribers.size === 0){
        matchSubscribers.delete(matchId);
    }
    
}

function cleanupSubscriptions(socket){
    for(const matchId of socket.subscriptions){
        unsubscribe(matchId, socket);
    }
}

function broadcastToMatch(matchId, payload){
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers || subscribers.size === 0){return}

    const message = JSON.stringify(payload);
    for(const client of subscribers){
        if(client.readyState === WebSocket.OPEN){
            client.send(message);
        }
    }
}

function sendJson(socket,payload){
    if(socket.readyState !== WebSocket.OPEN){return}    //Gauid Function

    socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload){
    for(const client of wss.clients){
        sendJson(client, payload);
    }
}

function handleMessage(socket, data){
    let message;
    try {
        message = JSON.parse(data.toString());
    } catch (e) {
        sendJson(socket, {type: 'error', error: 'Invalid JSON format'});
        return;
    }

    if(message?.type === 'subscribe' && Number.isInteger(message.matchId)){
        subscribe(message.matchId, socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket, {type: 'subscribed', matchId: message.matchId});
        return
    } 
    if(message?.type === 'unsubscribe' && Number.isInteger(message.matchId)){
        unsubscribe(message.matchId, socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket, {type: 'unsubscribed', matchId: message.matchId});
        return
    }
}


 export function attachWebSocketServer(server){
    const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024 * 1024,
    perMessageDeflate: false, 
});
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
        socket.subscriptions = new Set(); // Track match subscriptions for cleanup
        // Arcjet check already performed during upgrade; just welcome the client.
        sendJson(socket,{type: 'welcome'});
        socket.on('message', (data) => handleMessage(socket, data));

        socket.on('error', () => {
            socket.terminate(); // Ensure socket is fully closed on error
        })

        socket.on('close', () => {
            cleanupSubscriptions(socket); // Remove from all match subscriptions
        })

        socket.on('error', console.error);
    });


function broadcastMatchCreated(match){ // Broadcast new match to all clients; they can choose to subscribe for details
    broadcastToAll(wss, {type: 'match_created', data: match});
}

function broadcastCommentary(matchId, commentary){
    broadcastToMatch(matchId, {type: 'new_commentary', data: commentary});
}                           

return {broadcastMatchCreated, broadcastCommentary}

}