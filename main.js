const url = new URL(window.location.href);
const scenarioNumber = parseInt(url.searchParams.get('n') || 0);

let selected = null;
let selectTime = 0;
let lastEventUuid = null;
let ws = null;
let loading = false;
let cursorLastUpdates = {};
let alignment = 'horz';
let scenarioItems = ['coin', 'obstacle1', 'difficult', 'treasure', 'spikeTrap', 'bearTrap'];
let scenarioMonsters = [
    'ancient artillery',
    'bandit archer',
    'bandit guard',
    'black imp',
    'cave bear',
    'city archer',
    'city guard',
    'cultist',
    'deep terror',
    'earth demon',
    'flame demon',
    'forest imp',
    'frost demon',
    'giant viper',
    'harrower infester',
    'hound',
    'inox archer',
    'inox bodyguard',
    'inox guard',
    'inox shaman',
    'living bones',
    'living dead',
    'living spirit',
    'lurker',
    'night demon',
    'ooze',
    'rending drake',
    'savaas icestorm',
    'savaas lavaflow',
    'spitting drake',
    'stone golem',
    'sun demon',
    'vermling scout',
    'vermling shaman',
    'wind demon',
];

function setScenario() {
    const scenarioContainer = document.querySelector('.scenario-container');
    scenarioContainer.appendChild(createTrashCan());
    seedScenarioItems();
}

function seedScenarioItems(items = scenarioItems, monsters = scenarioMonsters) {
    scenarioItems = items;
    scenarioMonsters = monsters;

    document.getElementById('scenarioMonsters').value = monsters.join(',');
    document.getElementById('scenarioItems').value = items.join(',');

    // play mode
    removeAll('.scenario-items');
    const scenarioItemsContainer = document.querySelector('.scenario-items');
    items.forEach(
        item => scenarioItemsContainer.appendChild(createScenarioItem(item, {click: () => createWithAlignment(item)}))
    );

    seedMonsterTypes(monsters);

    // design mode
    removeAll('#designToolBox .scenario-items');
    const designToolboxScenarioItemsContainer = document.querySelector('#designToolBox .scenario-items');
    ['stoneDoor', 'woodDoor', 'darkFog', 'lightFog', 'corridor'].forEach(type => {
        designToolboxScenarioItemsContainer.appendChild(createScenarioItem(type, {
            extraClasses: ['door'],
            click: () => door(type)
        }));
    })
    designToolboxScenarioItemsContainer.appendChild(createScenarioItem('start', {style: start, click: () => start()}));
}

function clearSelection() {
    selected && selected.classList.remove('selected');
    selected = null;
}

function clearIdleSelection() {
    if (Date.now() - selectTime > 5000) {
        clearSelection();
    }
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
            remove(selected.id);
        } else {
            const top = `${y - selected.getBoundingClientRect().height / 2}`;
            const left = `${x - selected.getBoundingClientRect().width / 2}`;
            move(selected.id, top, left);
        }
        clearSelection();
        return false;
    }
    if (!target.id) {
        return true;
    }
    if (!target.classList.contains('item') && !target.classList.contains('map')) {
        return true;
    }
    selected = target;
    selectTime = Date.now();
    selected.classList.add('selected');
}

function create(text, ...classes) {
    sendEvent({
        type: 'create',
        meta: {text, classes: classes}
    });
}

function move(id, top, left) {
    sendEvent({
        id,
        type: 'move',
        meta: {top, left}
    });
}

function remove(id) {
    sendEvent({
        id,
        type: 'remove',
    });
}

function scenarioAlignment() {
    const alignment = document.querySelector("#scenarioAlignment").value;
    sendEvent({type: 'alignment', meta: {alignment}});
}

function mapTile() {
    const mapTileName = document.querySelector("#mapTileName").value.trim();
    if (mapTileName.length !== 3) {
        return;
    }
    const name = mapTileName[0].toUpperCase() + mapTileName[1] + mapTileName[2].toLowerCase();
    const rotation = document.querySelector("#mapTileRotation").value;
    sendEvent({type: 'createMapTile', meta: {name, rotation}});
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

function classWithAlignment(name) {
    return `${name}${alignment === 'horz' ? 'Horz' : ''}`;
}

function seedMonsterTypes(monsterTypes) {
    const monsterSelector = document.querySelector('#monster_type');
    removeAll('#monster_type');
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

function createMapTile(mapName, {id, classes = [], style}) {
    const div = document.createElement('div');
    if (id) {
        div.id = id;
    }
    addClasses(div, ['map']);
    setStyle(div, style);

    const img = document.createElement('img');
    img.src = `./scenBook/scenTiles/${mapName}.png`;
    addClasses(img, classes);
    div.appendChild(img);

    return div;
}

function createIndicator() {
    create('', 'indicator', 'item', 'waiting-area');
}

function switchDesignMode() {
    const designMode = document.querySelector("#designMode").checked;
    if (designMode) {
        document.body.classList.add('design-mode');
    } else {
        document.body.classList.remove('design-mode');

        const oldMonsters = scenarioMonsters.join(',');
        const newMonsters = document.getElementById('scenarioMonsters').value;
        const oldItems = scenarioItems.join(',');
        const newItems = document.getElementById('scenarioItems').value;
        if (oldMonsters !== newMonsters || oldItems !== newItems) {
            sendEvent({
                type: 'available',
                meta: {
                    monsters: newMonsters.split(','),
                    items: newItems.split(',')
                }
            });
        }
    }
}

function createScenarioItem(name, {style, click, extraClasses = []}) {
    const item = document.createElement('div');
    addClasses(item, [classWithAlignment(name), 'item', ...extraClasses.map(classWithAlignment)]);
    setStyle(item, style);
    click && (item.onclick = click);
    return item;
}

function createWithAlignment(name) {
    create('', classWithAlignment(name));
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

function door(type) {
    create('', classWithAlignment('door'), classWithAlignment(type), 'item');
}

function hazard() {
    createWithAlignment(`hazard`);
}

function obstacle(size) {
    createWithAlignment(`obstacle${size}`);
}

function monster() {
    const isElite = document.querySelector("#elite").checked;
    const standee = parseInt(document.querySelector("#standee").value) || 0;
    const type = document.querySelector("#monster_type").value.toLowerCase();
    const classes = monsterClasses(alignment, type, isElite);
    create(standee, ...classes);
    document.querySelector("#standee").value = standee + 1;
}

function marker() {
    const markerText = document.querySelector('#markerText').value;
    create(markerText, ['marker', 'item']);
}

function character() {
    const type = document.querySelector("#character").value;
    create('', 'character', type);
}

function summon() {
    const type = document.querySelector("#summon").value;
    create(type, 'summon');
}

function reset() {
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

function loadFromServer() {
    loading = true;
    const bufferedWsEvents = [];
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(wsUrl());
    ws.addEventListener('open', evt => {
        console.info('Websocket established', evt);
    })

    ws.addEventListener('message', evt => {
        console.debug('WS message', evt);
        const event = JSON.parse(evt.data);

        if (loading) {
            // buffer events that come in while loading
            bufferedWsEvents.push(event);
        } else {
            onEvent(event);
        }
    });

    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status !== 200) {
            console.error('Error fetching state from server', xhr.statusText, xhr);
            return;
        }
        const events = JSON.parse(xhr.responseText);

        load(events);

        // discard events that don't match our state
        while (bufferedWsEvents.length && bufferedWsEvents[0].prevUuid && bufferedWsEvents[0].prevUuid !== lastEventUuid) {
            const discardedEvent = bufferedWsEvents.unshift();
            console.warn('Dropped WS event because it did not follow last applied event', discardedEvent);
        }

        bufferedWsEvents.forEach(evt => onEvent(evt));

        loading = false;
    }
    xhr.open('GET', `/events/${scenarioNumber}`);
    xhr.send();
}

function wsUrl() {
    const loc = window.location;
    let wsUri;
    if (loc.protocol === "https:") {
        wsUri = "wss:";
    } else {
        wsUri = "ws:";
    }
    wsUri += "//" + loc.host;
    wsUri += '/updates';
    return wsUri;
}

function load(events) {
    reset();
    events.forEach(evt => onEvent(evt));
}

function sendEvent(evt) {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
        if (xhr.status !== 200) {
            console.error('Failed to send event', xhr.statusText, xhr);
        }
    }

    xhr.open('POST', `/events/${scenarioNumber}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(evt));
}

// only accessible from console
function resetServer() {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
        if (xhr.status !== 200) {
            console.error('Failed to reset server', xhr.statusText, xhr);
        }
    }

    xhr.open('DELETE', `/events/${scenarioNumber}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
}

function onCreate(id, text, ...classes) {
    const item = document.createElement('div');
    item.id = id;
    addClasses(item, [...classes, 'item', 'waiting-area']);

    item.textContent = text;
    initDragDrop(item);
    document.querySelector('.scenario-container').appendChild(item);
}

function onMove(id, top, left) {
    const selected = document.querySelector(`[id='${id}']`);
    selected.style.top = top;
    selected.style.left = left;
    selected.classList.remove('waiting-area');
}

function onRemove(id) {
    const item = document.querySelector(`[id='${id}']`);
    document.querySelector('.scenario-container').removeChild(item);
}

function onCursor(event) {
    const id = event.id;
    let item = document.getElementById(id);

    if (!item) {
        item = document.createElement('div');
        item.id = id;
        addClasses(item, ['cursor']);
        document.getElementsByTagName('body')[0].appendChild(item);
    }

    cursorLastUpdates[id] = Date.now();
    item.style.visibility = 'visible';
    item.style.left = (event.meta.x - (item.getBoundingClientRect().width / 2)) + 'px';
    item.style.top = (event.meta.y - (item.getBoundingClientRect().height / 2)) + 'px';
    item.style['background-color'] = event.meta.c;
}

function onAlignment(align) {
    alignment = align;
    document.getElementById('scenarioAlignment').value = align;
    seedScenarioItems();
}

function onCreateMapTile(id, name, rotation) {
    const item = createMapTile(name, {id, classes: rotation ? [rotation] : []});
    initDragDrop(item);
    document.querySelector('.scenario-container').appendChild(item);
}

function onEvent(event) {

    // only sent on incremental events
    if (event.prevUuid && (event.prevUuid !== lastEventUuid)) {
        console.error(`Missed event ${event.prevUuid}, loading fresh`, event);
        loadFromServer();
        return;
    }

    if (event.uuid) {
        lastEventUuid = event.uuid;
        console.debug('Processed event', lastEventUuid);
    }

    switch (event.type) {
        case 'create':
            onCreate(event.id, event.meta.text, ...event.meta.classes);
            return;
        case 'move':
            onMove(event.id, event.meta.top, event.meta.left);
            return;
        case 'remove':
            onRemove(event.id);
            return;
        case 'cursor':
            onCursor(event);
            return;
        case 'alignment':
            onAlignment(event.meta.alignment);
            return;
        case 'available':
            seedScenarioItems(event.meta.items, event.meta.monsters);
            return;
        case 'createMapTile':
            onCreateMapTile(event.id, event.meta.name, event.meta.rotation);
            return;
        case 'forceRefresh':
            loadFromServer();
            return;
        case 'stateCorrection':
            // the sole purpose for this event is to make sure the lastEventUuid is correct even if history has
            // been collapsed
            return;
        default:
            console.error(`Unrecognized event type: ${event.type}`, event);
    }
}

let dragOffsetX = 0;
let dragOffsetY = 0;
let draggedItem;

function finishDrag(evt) {
    const rect = draggedItem.getBoundingClientRect();
    const x = evt.pageX - draggedItem.parentElement.offsetLeft + (rect.width / 2) + dragOffsetX - 1;
    const y = evt.pageY - draggedItem.parentElement.offsetTop + (rect.height / 2) + dragOffsetY - 1;
    if (shouldBeRemoved(x, y)) {
        remove(draggedItem.id);
    } else {
        const top = `${y - draggedItem.getBoundingClientRect().height / 2}`;
        const left = `${x - draggedItem.getBoundingClientRect().width / 2}`;
        move(draggedItem.id, top, left);
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
    loadFromServer();
    document.body.ondragleave = evt => {
        // should be true only in firefox when drag ends
        if (evt.buttons === 0) {
            finishDrag(evt);
        }
    };
};

window.addEventListener('mousedown', e => {
    if (e.button === 0 && e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

let bufferedMouseMove = 0;
let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', e => {
    mouseX = e.pageX;
    mouseY = e.pageY;

    if (bufferedMouseMove) {
        return;
    }

    bufferedMouseMove = setTimeout(() => {
        bufferedMouseMove = 0;
        if (ws && ws.readyState === 1) {
            try {
                ws.send(JSON.stringify({type: 'cursor', x: mouseX, y: mouseY}));
            } catch (e) {
                console.warn('Unable to send cursor', e);
            }
        }
    }, 50);
});

window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        clearSelection();
    }
    if (selected) {
        if (!e.key.startsWith('Arrow')) {
            return;
        }
        e.preventDefault();
        selectTime = Date.now();

        let top = parseInt(selected.style.top) || 0;
        let left = parseInt(selected.style.left) || 0;
        switch (e.key) {
            case 'ArrowRight':
                left++;
                break;
            case 'ArrowLeft':
                left--;
                break;
            case 'ArrowUp':
                top--;
                break;
            case 'ArrowDown':
                top++;
                break;
        }
        move(selected.id, top, left);
    }
});

setInterval(() => {
    const now = Date.now();

    // hide inactive cursors
    Object.entries(cursorLastUpdates).forEach(([id, time]) => {
        if (now - time > 10000) {
            const item = document.getElementById(id);
            item.style.visibility = 'hidden';
        }
    });

    // idle selection
    clearIdleSelection();
}, 1000);
