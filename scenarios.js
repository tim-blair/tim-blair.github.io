const scenarios = new Map();
scenarios.set(1, {
    id: 1,
    alignment: 'horz',
    map: {
        G1b: {classes: ['revrotate'], style: {top: '144px', left: '400px'}},
        I1b: {classes: ['rotate'], style: {top: '91px', left: '204px'}},
        L1a: {classes: ['rotate'], style: {top: '423px', left: '487px'}},
    },
    monsters: ['bandit guard', 'bandit archer', 'living bones'],
    items: ['coin', 'treasure', 'trap', 'obstacle1'],
    start: [
        {top: '705px', left: '625px'},
        {top: '735px', left: '575px'},
        {top: '675px', left: '575px'},
        {top: '705px', left: '525px'},
        {top: '675px', left: '675px'},
        {top: '735px', left: '675px'},
        {top: '705px', left: '725px'},
    ],
    doors: [
        {top: '229px', left: '514px'},
        {top: '466px', left: '616px'},
    ]
});
scenarios.set(18, {
    id: 18,
    alignment: 'horz',
    style: {height: '900px'},
    map: {
        H1b: {classes: ['rotate'], style: {top: '0px', left: '405px'}},
        H3b: {classes: ['rotate'], style: {top: '409px', left: '405px'}},
        M1a: {classes: ['rotate'], style: {top: '408px', left: '30px'}},
    },
    monsters: ['giant viper', 'ooze', 'vermling scout'],
    items: ['coin', 'treasure', 'poisonGas', 'water'],
    start: [
        {top: '164px', left: '447px'},
        {top: '223px', left: '447px'},
        {top: '194px', left: '498px'},
        {top: '252px', left: '498px'},
        {top: '223px', left: '550px'},
    ],
    doors: [
        {top: '392px', left: '742px'},
        {top: '596px', left: '391px'},
    ],
    markers: {
        1: {top: '613px', left: '410px'},
    }
});
scenarios.set(20, {
    id: 20,
    alignment: 'vert',
    style: {height: '1150px'},
    map: {
        K1a: {style: {top: '304px', left: '289px'}},
        J1a: {classes: ['rotate'], style: {top: '598px', left: '59px'}},
        C1a: {style: {top: '658px', left: '554px', transform: 'scale(0.15)'}},
        D1a: {style: {top: '0', left: '350px'}},
    },
    monsters: ['living bones', 'cultist', 'night demon', 'living corpse', 'jekserah'],
    items: ['coin', 'treasure', 'bearTrap', 'obstacle1'],
    start: [
        {top: '903px', left: '77px'},
        {top: '955px', left: '49px'},
        {top: '955px', left: '106px'},
        {top: '955px', left: '165px'},
        {top: '1006px', left: '136px'},
    ],
    doors: [
        {top: '286px', left: '539px'},
        {top: '641px', left: '394px'},
        {top: '641px', left: '685px'},
    ],
    markers: {
        1: {top: '307px', left: '556px'},
    }
});
