let selected = null;
const history = [];
const peerConnections = [];
let nextId = 100;

function setScenario() {
    const scenarioContainer = document.querySelector('.scenario-container');
    if(scenario.style) {
        setStyle(scenarioContainer, scenario.style);
    }
    Object.keys(scenario.map).forEach(mapName =>
        scenarioContainer.appendChild(createMapTile(mapName, scenario.map[mapName])));
    scenario.start.forEach(start => scenarioContainer.appendChild(createScenarioItem('start', start)));
    scenario.doors.forEach(door => scenarioContainer.appendChild(createScenarioItem('door', door)));
    if(scenario.markers) {
        Object.keys(scenario.markers).forEach(name => scenarioContainer.appendChild(createMarker(name, scenario.markers[name])));
    }
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
    const selected = document.querySelector(`#${id}`);
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
    const item = document.querySelector(`#${id}`);
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

function setStyle(element, style) {
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
        opt.innerHTML = monsterType;
        monsterSelector.appendChild(opt);
    });
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

function createScenarioItem(name, style) {
    const item = document.createElement('div');
    addClasses(item, [itemClass(name), 'item']);
    setStyle(item, style);
    return item;
}

function createWithAlignment(name) {
    create('', itemClass(name));
}

function create(text, ...classes) {
    createWithId('', `gh${nextId++}`, text, ...classes);
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
    for (conn of peerConnections) {
        if (conn.peer !== source) {
            conn.send([evt]);
        }
    }
    save();
}

function save() {
    const serializedHistory = JSON.stringify(history);
    localStorage.setItem(`history[${scenario.id}]`, serializedHistory);
}

function view() {
    console.log(JSON.stringify(history));
}

function reset() {
    localStorage.removeItem(`history[${scenario.id}]`);
    location.reload();
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
        maxIdSeen = Math.max(maxIdSeen, parseInt(event.id.slice(2)));
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

function initDragDrop(item) {
    item.draggable = true;
    let offsetX = 0;
    let offsetY = 0;
    item.ondragstart = evt => {
        const rect = evt.target.getBoundingClientRect();
        offsetX = rect.x - evt.clientX;
        offsetY = rect.y - evt.clientY;
    };

    item.ondragend = evt => {
        const rect = item.getBoundingClientRect();
        const x = evt.pageX - item.parentElement.offsetLeft + (rect.width / 2) + offsetX - 1;
        const y = evt.pageY - item.parentElement.offsetTop + (rect.height / 2) + offsetY - 1;
        if (shouldBeRemoved(x, y)) {
            remove('', evt.target.id);
        } else {
            move('', evt.target.id, x, y);
        }
        clearSelection();
    };
}

function blessPredefinedItems() {
    document.querySelectorAll('.item[id]').forEach(item => {
        initDragDrop(item);
    });
}

window.onload = function () {
    setScenario();
    blessPredefinedItems();
    const history = localStorage.getItem(`history[${scenario.id}]`);
    if (history) {
        loadRaw(history);
    }
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
        connection.send(history);
    });
    connection.on('data', (data) => load(connection.peer, data));
    peerConnections.push(connection);
});
peer.on('error', (err) => {
    console.log(`error: ${err}`);
});

function connect() {
    const peerId = document.querySelector(`#peer`).value;
    const connection = peer.connect(peerId);
    connection.on('open', () => {
        connection.on('data', (data) => load(connection.peer, data));
    });
    peerConnections.push(connection);
}
