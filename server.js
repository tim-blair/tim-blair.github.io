const { v4: uuid } = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const expressWs = require('express-ws');
const fs = require('fs');

const {scenarios} = require('./scenarios');

expressWs(app);

const port = 7689;

const CURSOR_COLORS = [
    '#e6194b',
    '#3cb44b',
    '#ffe119',
    '#4363d8',
    '#f58231',
    '#911eb4',
    '#46f0f0',
    '#f032e6',
    '#bcf60c',
    '#fabebe',
    '#008080',
    '#e6beff',
    '#9a6324',
    '#fffac8',
    '#800000',
    '#aaffc3',
    '#808000',
    '#ffd8b1',
    '#000075',
    '#808080',
    '#ffffff',
    '#000000'
];

let lastEventUuid = null;
let state = {};
let sockets = {};
let cursorColors = {};

// generic settings
app.use(bodyParser.json());

// static files
const dir = __dirname;
const staticFiles = [
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
    const events = [...compactedHistory(req.params.scenId), {
        // always end with an event with the current last event uuid.  This is because the current
        // compactedHistory implementation might remove the last event we recorded and thus not send it to the
        // client, or might reorder it
        type: 'stateCorrection',
        uuid: lastEventUuid
    }];
    res.json(events);
});

app.post('/events/:scenId(\\d+)', (req, res) => {
    var event = req.body;

    const eventUuid = uuid();
    event.uuid = eventUuid;
    const prevUuid = lastEventUuid;
    lastEventUuid = eventUuid;

    // server is sole source of IDs, creates are sent without ids
    if (event.type === 'create' || event.type === 'createMapTile') {
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
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(event));
            }
        } catch (e) {
            console.warn('Failed to send event to socket', e, event, ws);
        }
    });
}


// websocket
app.ws('/updates', function (ws) {
    const wsUuid = uuid();
    sockets[wsUuid] = ws;
    const color = CURSOR_COLORS.filter(color => !Object.values(cursorColors).includes(color))[0] || '#FFFFFF';
    cursorColors[wsUuid] = color;

    console.log('Active clients:', cursorColors);

    ws.on('close', () => {
        delete sockets[wsUuid];
        delete cursorColors[wsUuid];
    });

    ws.on('error', (err) => {
        console.error('Error in WS connection ' + wsUuid, err);
        delete sockets[wsUuid];
        delete cursorColors[wsUuid];
    });

    ws.on('message', msg => {
        const event = JSON.parse(msg);
        if (event.type === 'cursor') {
            publish({
                type: 'cursor',
                id: wsUuid,
                meta: {
                    x: event.x,
                    y: event.y,
                    c: color
                }
            });
        }
    });
});


app.listen(port, () => console.log(`Now running at http://localhost:${port}`));

function fetchScenarioEvents(scenId) {
    if (typeof scenId !== "number") {
        try {
            scenId = parseInt(scenId);
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    const scenario = scenarios.get(scenId);
    if (!scenario) {
        return [];
    }

    const events = [];
    if (scenario.map) {
        Object.entries(scenario.map).forEach(([tileId, meta]) => {
            const tileUuid = uuid();
            events.push({
                type: 'createMapTile',
                id: tileUuid,
                meta: {
                    name: tileId,
                    rotation: (meta.classes && meta.classes.length && meta.classes[0]) || null
                }
            });

            if (meta.style && (meta.style.top || meta.style.left)) {
                events.push({
                    type: 'move',
                    id: tileUuid,
                    meta: {
                        top: meta.style.top,
                        left: meta.style.left
                    }
                });
            }
        });
    }

    return events;
}

function fetchState(scenId) {
    if (!state[scenId]) {
        state[scenId] = {
            events: fetchScenarioEvents(scenId)
        }
        save();
    }

    if (!state[scenId].events) {
        state[scenId].events = [];
    }
    return state[scenId];
}

function compactedHistory(scenId) {
    const events = fetchState(scenId).events;
    const trimmed = new Map();
    for (let evt of events) {
        switch (evt.type) {
            case 'create':
            case 'createMapTile':
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
    fs.writeFile('state.json', data, (err) => {
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
