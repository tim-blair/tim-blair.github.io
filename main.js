let selected = null;
let history = [];
const peerConnections = {};
let nextId = 100;

function setScenario() {
    const scenarioContainer = document.querySelector('.scenario-container');
    const scenarioItemsContainer = document.querySelector('.scenario-items');
    setStyle(scenarioContainer, scenario.style);
    scenarioContainer.appendChild(createTrashCan());
    Object.keys(scenario.map).forEach(mapName =>
        scenarioContainer.appendChild(createMapTile(mapName, scenario.map[mapName])));
    scenario.start.forEach(start => scenarioContainer.appendChild(createScenarioItem('start', {style: start})));
    scenario.doors.forEach(door => scenarioContainer.appendChild(createScenarioItem('door', {style: door})));
    scenario.items.forEach(item => scenarioItemsContainer.appendChild(createScenarioItem(item, {click: () => createWithAlignment(item)})));
    Object.keys(scenario.markers || {}).forEach(name => scenarioContainer.appendChild(createMarker(name, scenario.markers[name])));
    seedMonsterTypes(scenario.monsters);
}

function clearSelection() {
    selected && selected.classList.remove('selected');
    selected = null;
}

function handleClick(e) {
    if (e.button !== 0) {
        return true;
    }
    e = e || window.event;
    const target = e.target || e.srcElement;
    if (selected) {
        const x = e.pageX - selected.parentElement.offsetLeft;
        const y = e.pageY - selected.parentElement.offsetTop;
        if (shouldBeRemoved(x, y)) {
            remove('', selected.id);
        } else {
            move('', selected.id, x, y);
        }
        clearSelection();
        return false;
    }
    if (!target.classList.contains('item') || !target.id) {
        return true;
    }
    selected = target;
    selected.classList.add('selected');
}

function move(source, id, x, y) {
    const selected = document.querySelector(`[id='${id}']`);
    selected.style.top = `${y - selected.clientHeight / 2}`;
    selected.style.left = `${x - selected.clientWidth / 2}`;
    selected.classList.remove('waiting-area');
    recordEvent(source, {
        id,
        type: 'move',
        meta: {x, y}
    });
    save();
}

function remove(source, id) {
    const item = document.querySelector(`[id='${id}']`);
    document.querySelector('.scenario-container').removeChild(item);
    recordEvent(source, {
        id,
        type: 'remove',
    });
    save();
}

function shouldBeRemoved(x, y) {
    return withinTrashCan(x, y);
}

function withinTrashCan(x, y) {
    const trashCan = document.querySelector('.trash-can');
    return x >= trashCan.offsetLeft && x <= trashCan.offsetLeft + trashCan.offsetWidth
        && y >= trashCan.offsetTop && y <= trashCan.offsetTop + trashCan.offsetHeight;
}

function setStyle(element, style = {}) {
    Object.keys(style).forEach(key => element.style.setProperty(key, style[key]));
}

function addClasses(element, classes) {
    classes.forEach(cls => element.classList.add(cls));
}

function itemClass(name) {
    return `${name}${scenario.alignment === 'horz' ? 'Horz' : ''}`;
}

function seedMonsterTypes(monsterTypes) {
    const monsterSelector = document.querySelector('#monster_type');
    monsterTypes.forEach(monsterType => {
        const opt = document.createElement('option');
        opt.value = monsterType;
        opt.innerHTML = monsterType.replace(/\b\w/g, l => l.toUpperCase());
        monsterSelector.appendChild(opt);
    });
}

function createTrashCan() {
    const div = document.createElement('div');
    addClasses(div, ['trash-can', 'waiting-area']);
    return div;
}

function createMapTile(mapName, {classes = [], style}) {
    const div = document.createElement('div');
    addClasses(div, ['map']);
    setStyle(div, style);

    const img = document.createElement('img');
    img.src = `./scenBook/scenTiles/${mapName}.png`;
    addClasses(img, classes);
    div.appendChild(img);

    return div;
}

function createMarker(name, style) {
    const item = document.createElement('div');
    addClasses(item, ['marker']);
    setStyle(item, style);
    item.textContent = name;
    return item;
}

function createScenarioItem(name, {style, click}) {
    const item = document.createElement('div');
    addClasses(item, [itemClass(name), 'item']);
    setStyle(item, style);
    click && (item.onclick = click);
    return item;
}

function createWithAlignment(name) {
    create('', itemClass(name));
}

function create(text, ...classes) {
    if (!peeringId) {
        console.log(`Cannot create ${text}: waiting for peeringId`);
        return;
    }
    createWithId('', `${peeringId}-gh${nextId++}`, text, ...classes);
}

function createWithId(source, id, text, ...classes) {
    const item = document.createElement('div');
    item.id = id;
    addClasses(item, [...classes, 'item', 'waiting-area']);
    recordEvent(source, {
        id: item.id,
        type: 'create',
        meta: {text, classes: toArray(item.classList)}
    });
    item.textContent = text;
    initDragDrop(item);
    document.querySelector('.scenario-container').appendChild(item);
}

function toArray(classList) {
    const iter = classList.entries();
    const array = [];
    while (true) {
        const {value, done} = iter.next();
        if (done) {
            break;
        }
        array.push(value[1]);
    }
    return array;
}

function coin() {
    create('', `coin`);
}

function start() {
    createWithAlignment(`start`);
}

function trap() {
    createWithAlignment(`trap`);
}

function pressure() {
    createWithAlignment(`pressure`);
}

function treasure() {
    createWithAlignment(`treasure`);
}

function terrain() {
    createWithAlignment(`terrain`);
}

function altar() {
    createWithAlignment(`altar`);
}

function door() {
    createWithAlignment(`door`);
}

function hazard() {
    createWithAlignment(`hazard`);
}

function obstacle(size) {
    createWithAlignment(`obstacle${size}`);
}

function monster() {
    const isElite = document.querySelector("#elite").checked;
    const standee = document.querySelector("#standee").value;
    const type = document.querySelector("#monster_type").value.toLowerCase();
    const classes = monsterClasses(scenario, type, isElite);
    create(standee, ...classes);
}

function character() {
    const type = document.querySelector("#character").value;
    create('', 'character', type);
}

function summon() {
    const type = document.querySelector("#summon").value;
    create(type, 'summon');
}

function recordEvent(source, evt) {
    history.push(evt);
    Object.values(peerConnections).forEach(conn => {
        if (conn.peer !== source) {
            conn.send({history: [evt]});
        }
    });
    save();
}

function save() {
    const serializedHistory = JSON.stringify(history);
    localStorage.setItem(`history[${scenario.id}]`, serializedHistory);
}

function view() {
    console.log(JSON.stringify(history));
}

function compact() {
    const trimmed = new Map();
    for(let evt of history) {
        switch(evt.type) {
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
    history = [];
    trimmed.forEach(value => {
        history.push(value.create);
        if(value.move) {
            history.push(value.move);
        }
    });
    save();
}

function reset() {
    localStorage.removeItem(`history[${scenario.id}]`);
    removeAll('.scenario-container');
    removeAll('.scenario-items');
    removeAll('#monster_type');
    setScenario();
}

function removeAll(selector) {
    const container = document.querySelector(selector);
    while (container.firstChild) {
        container.removeChild(container.lastChild);
    }
}

function loadRaw(events) {
    const parsed = JSON.parse(events);
    load('', parsed);
}

let loading = false;

function load(source, events) {
    loading = true;
    let maxIdSeen = nextId - 1;
    const createEvents = events.filter(event => event.type === 'create');
    const moveEvents = events.filter(event => event.type === 'move' || 'remove');
    for (let event of createEvents) {
        createWithId(source, event.id, event.meta.text, ...event.meta.classes);
        maxIdSeen = Math.max(maxIdSeen, parseInt(event.id.substring(event.id.indexOf('-') + 3)));
    }
    // Wait for the DOM updates
    setTimeout(() => {
        for (let event of moveEvents) {
            if (event.type === 'move') {
                move(source, event.id, event.meta.x, event.meta.y);
            }
            if (event.type === 'remove') {
                remove(source, event.id);
            }
        }
        loading = false;
    }, 100);
    nextId = maxIdSeen + 1;
}

let dragOffsetX = 0;
let dragOffsetY = 0;
let draggedItem;

function finishDrag(evt) {
    const rect = draggedItem.getBoundingClientRect();
    const x = evt.pageX - draggedItem.parentElement.offsetLeft + (rect.width / 2) + dragOffsetX - 1;
    const y = evt.pageY - draggedItem.parentElement.offsetTop + (rect.height / 2) + dragOffsetY - 1;
    if (shouldBeRemoved(x, y)) {
        remove('', draggedItem.id);
    } else {
        move('', draggedItem.id, x, y);
    }
    clearSelection();
}

function initDragDrop(item) {
    item.draggable = true;
    item.ondragstart = evt => {
        const rect = evt.target.getBoundingClientRect();
        dragOffsetX = rect.x - evt.clientX;
        dragOffsetY = rect.y - evt.clientY;
        draggedItem = evt.target;
    };

    item.ondragend = evt => {
        // should be true in all browsers, except firefox
        if (evt.pageX !== 0 && evt.pageY !== 0) {
            finishDrag(evt);
        }
    };
}

window.onload = function () {
    setScenario();
    const history = localStorage.getItem(`history[${scenario.id}]`);
    if (history) {
        loadRaw(history);
    }
    document.body.ondragleave = evt => {
        // should be true only in firefox when drag ends
        if (evt.buttons === 0) {
            finishDrag(evt);
        }
    };
};

let peer = new Peer();
let peeringId;

peer.on('open', (id) => {
    peeringId = id;
    console.log(`peering id is: ${id}`);
});

// Someone connected to us, push our history to them
peer.on('connection', (connection) => {
    connection.on('open', () => {
        connection.send({reset: true, history});
    });
    if (peerConnections[connection.peer]) {
        return;
    }
    connection.on('data', (data) => load(connection.peer, data.history));
    peerConnections[connection.peer] = connection;
});
peer.on('error', (err) => {
    console.log(`error: ${err}`);
});

function connect() {
    const peerId = document.querySelector(`#peer`).value;
    const connection = peer.connect(peerId);
    if (peerConnections[connection.peer]) {
        return;
    }
    connection.on('open', () => {
        connection.on('data', (data) => {
            if (data.reset) {
                reset();
            }
            load(connection.peer, data.history);
        });
    });
    peerConnections[connection.peer] = connection;
}
