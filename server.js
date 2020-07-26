const { v4: uuid } = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const expressWs = require('express-ws')(app);
const fs = require('fs');

const port = 7688;

let lastEventUuid = null;
let state = {};
let sockets = {};

// generic settings
app.use(bodyParser.json());

// static files
var dir = __dirname;
var staticFiles = [
    'index.html',
    'common.css',
    'scenarios.js',
    'monsters.js',
    'monster.css',
    'main.js',
];

function serveFile(path, file) {
    app.get(path, (req, res) => res.sendFile(file, {root: dir}));
}

staticFiles.forEach(name => serveFile('/' + name, name));
serveFile('/', 'index.html');
app.use('/resources', express.static('resources'));
app.use('/scenBook', express.static('scenBook'));

// state

app.get('/events/:scenId(\\d+)', (req, res) => {
    res.json(compactedHistory(req.params.scenId));
});

app.post('/events/:scenId(\\d+)', (req, res) => {
    var event = req.body;
    console.log('Received event', event);

    const eventUuid = uuid();
    event.uuid = eventUuid;
    const prevUuid = lastEventUuid;
    lastEventUuid = eventUuid;

    // server is sole source of IDs, creates are sent without ids
    if (event.type === 'create') {
        event.id = uuid();
    }

    res.sendStatus(200);
    record(req.params.scenId, event);

    const wsEvent = {...event};
    wsEvent.prevUuid = prevUuid;
    publish(wsEvent);
});

app.delete('/events/:scenId(\\d+)', (req, res) => {
    console.info('Events cleared!');
    delete state[req.params.scenId];
    save();
    res.sendStatus(200);
    publish({
        uuid: uuid(),
        type: 'forceRefresh'
    });
});

function record(scenId, event) {
    const scenState = state[scenId] = (state[scenId] || {events: []});
    const events = scenState.events;
    events.push(event);
    save();
}

function publish(event) {
    Object.values(sockets).forEach(ws => {
        try {
            ws.send(JSON.stringify(event));
        } catch (e) {
            console.warn('Failed to send event to socket', e, event, ws);
        }
    });
}


// websocket
app.ws('/updates', function (ws, req) {
    const wsUuid = uuid();
    sockets[wsUuid] = ws;

    ws.on('close', () => {
        delete sockets[wsUuid];
    })

    ws.on('message', msg => {
        console.log('Got message', msg);
    });
});


app.listen(port, () => console.log(`Now running at http://localhost:${port}`));

function compactedHistory(scenId) {
    const events = (state[scenId] && state[scenId].events) || [];
    const trimmed = new Map();
    for (let evt of events) {
        switch (evt.type) {
            case 'create':
                trimmed.set(evt.id, {create: evt});
                break;
            case 'move':
                const eventToUpdate = trimmed.get(evt.id);
                eventToUpdate.move = evt;
                break;
            case 'remove':
                trimmed.delete(evt.id);
                break;
        }
    }
    const compactedHistory = [];
    trimmed.forEach(value => {
        compactedHistory.push(value.create);
        if (value.move) {
            compactedHistory.push(value.move);
        }
    });
    return compactedHistory;
}

function save() {
    const data = JSON.stringify(state, null, 2);
    fs.writeFile('state.json', data, (err, data) => {
        if (err) {
            console.error('Failed to save state', err);
        }
    });
}

function load() {
    fs.readFile('state.json', (err, data) => {
        if (err) {
            console.error('Error loading state', err);
        } else {
            try {
                state = JSON.parse(data);
            } catch (e) {
                console.error('Error loading state', e);
            }
        }
    });
}

load();
