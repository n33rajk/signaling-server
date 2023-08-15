/*******************************************************************
*	Function Name	: webRTC signaling server
*   https://github.com/websockets/ws/blob/master/doc/ws.md
********************************************************************/

require("dotenv").config();

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: process.env.PORT });

/*********************************************************************
 * variables.
**********************************************************************/

const debugLogFlag = true;
const debugTag = 'server: '

const pingStr = 'ping'
const pongStr = 'pong'

/*********************************************************************
 * Manage stored connections
**********************************************************************/

let autoTerminateWebsocketTime = 300000;
let sockets = {};

/*********************************************************************
 * Server webSocket functions.
**********************************************************************/

wss.on('listening', function () {
    debugLog("wss", "Server started on PORT: " + process.env.PORT);
});

//Emitted when the handshake is complete.
wss.on('connection', function (ws) {
    ws.on('error', console.error);

    ws.on('message', function message(msg) {
        debugLog('receivedMessageFromPeer  raw:', msg)
        receivedMessageFromPeer(ws, msg)
    });
    setTimeout(() => {
        ws.close(1000, "force terminate")
        delete sockets[ws.name];
        debugLog("force terminate", '');
    }, autoTerminateWebsocketTime);
})

//Emitted when the server closes. 
wss.on('close', function close() {
    debugLog("wss close", "Server stoped");
});

//Emitted when an error occurs on the underlying server.
wss.on('error', function (error) {
    debugLog("wss error", error);
});

//Emitted when an error occurs before the WebSocket connection is established.
wss.on('wsClientError', function (error) {
    debugLog("wss wsClientError", error);
});

function sendMessageToPeer(msg) {
    debugLog('sendMessageToPeer', msg)
    sockets[msg.to].send(JSON.stringify(msg));
};

/*******************************************************************
 * This function will handle clients msgs
 ********************************************************************/

function register(ws, msg)
{
    msg.type = pongStr;
    if (sockets[msg.from] == null)
    {
        const id = uniqueId();
        if(id)
        {
            msg.from = id;
            msg.to = id;
            ws.name = msg.from;
            sockets[msg.from] = ws;
        }
        else
        {
            ws.send(send(JSON.stringify(msg)))
            return;
        }
    }
    sendMessageToPeer(msg);
}

function uniqueId()
{
    let attempts = 0;
    let id = false;

    while(!id && attempts < 100) {
        id = randomId();
        if(!checkId(id)) 
        {
            id = false;
            attempts++;
        }
    }
    return id;
}

function checkId(id, existing = []) {
    let match = Object.keys(sockets).find(function(item) 
    {
        return item === id;
    });

    return match ? false : true;
  };

function randomId(length = 4) {
    return Math.random().toString(36).substring(2, length+2);
  };

/*******************************************************************
 * This function will handle client msgs
 ********************************************************************/
function receivedMessageFromPeer(ws, msg) {
    try {
        msg = JSON.parse(msg)
        debugLog('receivedMessageFromPeer', msg)
        switch (msg.type) {
            case pingStr:
                register(ws, msg);
                break;
            default:
                if (sockets[msg.to] == null)
                {
                    debugLog("ws", "target peer field empty: " + msg.to);
                }
                else {
                    sendMessageToPeer(msg);
                }
                break;
        }
    } catch (e) {
        debugLog('receivedMessageFromPeer Error: ', e)
    }
}

/*******************************************************************
 * This function will log errors and msgs
 ********************************************************************/

function debugLog(tag, msg) {
    if (debugLogFlag) {
        console.log(debugTag, tag, msg);
    }
};

/*******************************************************************
 * End of file
 ********************************************************************/