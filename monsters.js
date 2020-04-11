const monsters = new Map();
monsters.set('ancient artillery', 'AncientArtillery');
monsters.set('bandit archer', 'BanditArcher');
monsters.set('bandit guard', 'BanditGuard');
monsters.set('black imp', 'BlackImp');
monsters.set('cave bear', 'CaveBear');
monsters.set('city archer', 'CityArcher');
monsters.set('city guard', 'CityGuard');
monsters.set('cultist', 'Cultist');
monsters.set('deep terror', 'DeepTerror');
monsters.set('earth demon', 'EarthDemon');
monsters.set('flame demon', 'FlameDemon');
monsters.set('forest imp', 'ForestImp');
monsters.set('frost demon', 'FrostDemon');
monsters.set('giant viper', 'GiantViper');
monsters.set('harrower infester', 'HarrowerInfester');
monsters.set('hound', 'Hound');
monsters.set('inox archer', 'InoxArcher');
monsters.set('inox bodyguard', 'InoxBodyguard');
monsters.set('inox guard', 'InoxGuard');
monsters.set('inox shaman', 'InoxShaman');
monsters.set('living bones', 'LivingBones');
monsters.set('living dead', 'LivingDead');
monsters.set('living spirit', 'LivingSpirit');
monsters.set('lurker', 'Lurker');
monsters.set('night demon', 'NightDemon');
monsters.set('ooze', 'Ooze');
monsters.set('rending drake', 'RendingDrake');
monsters.set('savaas icestorm', 'SavaasIcestorm');
monsters.set('savaas lavaflow', 'SavaasLavaflow');
monsters.set('spitting drake', 'SpittingDrake');
monsters.set('stone golem', 'StoneGolem');
monsters.set('sun demon', 'SunDemon');
monsters.set('vermling scout', 'VermlingScout');
monsters.set('vermling shaman', 'VermlingShaman');
monsters.set('wind demon', 'WindDemon');

function monsterClasses(scenario, monster, elite) {
    return [
        'monster',
        monsters.has(monster) ? `${scenario.alignment}${monsters.get(monster)}` : 'missing-monster',
        ...(elite ? ['elite'] : []),
    ];
}
