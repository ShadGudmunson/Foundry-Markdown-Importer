import {abilitiesAdder, spellsAdder} from './ItemCreator.js';
import {
  convertResistance,
  convertSizes,
  getAbilities,
  getChallenge,
  getCreatureACAndSource,
  getCreatureHP,
  getCreatureName,
  getCreatureSizeAndAlignment,
  getCreatureSpeed,
  getCreatureStats,
  getDamageModifiers,
  getLanguages,
  getLegendaryActions,
  getNumberOfLegendaryActions,
  getNumberOfLegendaryResistances,
  getSavingThrowMods,
  getSenses,
  getSkills,
  getSpells,
  getSpellSlots,
  shortenAbilities,
  shortenSkills
} from './MarkdownParser.js';

const skillToAbilityMap = {
  'Athletics': 'Str',
  'Acrobatics': 'Dex',
  'Sleight of Hand': 'Dex',
  'Stealth': 'Dex',
  'Arcana': 'Int',
  'History': 'Int',
  'Investigation': 'Int',
  'Nature': 'Int',
  'Religion': 'Int',
  'Animal Handling': 'Wis',
  'Insight': 'Wis',
  'Medicine': 'Wis',
  'Perception': 'Wis',
  'Survival': 'Wis',
  'Deception': 'Cha',
  'Intimidation': 'Cha',
  'Performance': 'Cha',
  'Persuasion': 'Cha'
}

/**
 * Returns the foundry friendly structure for the ability scores
 *
 * @param stats - ability scores
 * @param saves - saves (used to decide if the creatures is proficient in a stat or not
 * @param proficiency - proficiency score
 * @private
 */
const _makeAbilitiesStructure = (stats, saves, proficiency) => {
  const abilitiesObject = {};
  for (const stat in stats) {
    if (!stats.hasOwnProperty(stat)) continue;
    const isProficient = saves ? saves[stat] ? 1 : 0 : 0;
    const modifier = Math.floor((Number(stats[stat]) - 10) / 2);
    abilitiesObject[stat.toLowerCase()] = {
      value: Number(stats[stat]),
      proficient: isProficient,
      prof: isProficient ? proficiency : 0,
      mod: modifier,
      save: isProficient ? modifier + proficiency : modifier
    };
  }
  return abilitiesObject;
};

/**
 * Returns the foundry friendly structure for skills
 *
 * @param propSkills - object containing all the skills data from the parser
 * @param proficiency - proficiency score
 * @private
 */
const _makeSkillsStructure = (propSkills, proficiency, creatureStats) => {
  const skillsObject = {};
  for (const skill in propSkills.skills) {
    let value = (propSkills.skills[skill] - Math.floor((creatureStats[skillToAbilityMap[skill]] - 10) / 2)) / proficiency;
    if (0 < value < 1) value = 0.5;
    if (!propSkills.skills.hasOwnProperty(skill)) continue;
    skillsObject[shortenSkills(skill)] = {
      value
    };
  }
  return skillsObject;
};

/**
 * Returns a foundry friendly structure for resistances
 *
 * @param modifiers - an object with all the damage modifiers of the creature
 * @private
 */
const _makeResistancesStructure = (modifiers) => {
  const conditionsDefault = ['blinded', 'charmed', 'deafened', 'diseased', 'exhaustion', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'];
  const defaultResistances = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
  const structure = {};
  for (const key in modifiers) {
    if (!modifiers.hasOwnProperty(key)) continue;
    const modifier = modifiers[key];
    const standardRes = [];
    const customRes = [];
    modifier.split(', ').forEach((mod) => {
      if (conditionsDefault.includes(mod) || defaultResistances.includes(mod)) standardRes.push(mod);
      else customRes.push(mod);
    });
    structure[convertResistance(key)] = {
      value: standardRes,
      custom: customRes.join(';')
    };
  }
  return structure;
};

/**
 * Returns a foundry friendly structure for languages
 *
 * @param languages - a string containing all the known languages of the actor
 * @private
 */
const _makeLanguagesStructure = (languages) => {
  const defaultLanguages = ['Aarokocra', 'Abyssal', 'Aquan', 'Auran', 'Celestial', 'Common', 'Deep speech', 'Draconic', 'Druidic', 'Dwarvish', 'Elvish', 'Giant', 'Gith', 'Gnoll', 'Gnomish', 'Goblin', 'Halfling', 'Ignan', 'Infernal', 'Orc', 'Primordial', 'Sylvan', 'Terran', 'Cant', 'Undercommon'];

  const languagesArray = languages.split(', ');
  const standardLg = [];
  const customLg = [];
  languagesArray.forEach((language) => {
    language = language[0].toLocaleUpperCase() + language.slice(1);
    if (defaultLanguages.includes(language)) standardLg.push(language.toLowerCase());
    else customLg.push(language);
  });
  return {
    value: standardLg,
    custom: customLg.join(';')
  };
};

/**
 * Returns a foundry friendly structure for the traits part of the actor
 *
 * @private
 * @param propsTraits - object containing all the traits data extracted from the parser
 */
const _makeTraitsStructure = (propsTraits) => {
  return {
    ...propsTraits.damageModifiers,
    size: convertSizes(propsTraits.size),
    languages: _makeLanguagesStructure(propsTraits.languages),
  };
};

/**
 * Returns a foundry friendly structure for the details part
 *
 * @param propsDetails - object containing all the details data from the parser
 * @param abilities - object structure of all abilities to get the spellcasting level if needed
 * @private
 */
const _makeDetailsStructure = (propsDetails, abilities) => {
  return {
    alignment: propsDetails.alignment,
    type: propsDetails.race,
    cr: propsDetails.challenge['CR'],
    xp: {
      value: propsDetails.challenge['XP']
    },
    spellLevel: abilities?.Spellcasting?.data?.level
  };
};

/**
 * Returns a foundry friendly structure for the HP
 *
 * @private
 * @param propsHP - object that contains all the hp data extracted from markdown
 */
const _makeHpStructure = (propsHP) => {
  return {
    value: Number(propsHP['HP']),
    max: Number(propsHP['HP']),
    formula: propsHP['formula']
  };
};

/**
 * Returns a foundry friendly structure for the attributes tab
 *
 * @param propsAttributes - object containing all the attributes extracted from markdown
 * @param creatureProficiency - creature's proficiency modifier
 * @param abilities - abilities object for extracting the spellcaster abilities of the creature
 * @private
 */
const _makeAttributesStructure = (propsAttributes, creatureProficiency, abilities) => {
  return {
    ac: {
      base: Number(propsAttributes.armor['AC']),
      flat: Number(propsAttributes.armor['AC']),
      value: Number(propsAttributes.armor['AC']),
      calc: 'natural'
    },
    hp: _makeHpStructure(propsAttributes.hp),
    movement: propsAttributes.movement,
    senses: propsAttributes.senses,
    prof: creatureProficiency,
    spellcasting: shortenAbilities(abilities?.Spellcasting?.data?.modifier)
  };
};

/**
 * Returns the resources structure
 *
 * @param propsRes - object that contains the resources from the parser
 * @private
 */
const _makeResourcesStructure = (propsRes) => {
  return {
    legact: {
      value: 0,
      max: 0
    },
    legres: {
      value: 0,
      max: 0
    }
  };
};

/**
 * Returns a foundry friendly structure for the data field of the actor
 *
 * @param propsData - an object that contains all the data extracted from the parser
 * @param creatureProficiency - proficiency of the actor
 * @param creatureAbilities - abilities object of the actor
 * @param creatureStats - stats of the actor
 * @private
 */
const _makeDataStructure = (propsData, creatureProficiency, creatureAbilities, creatureStats) => {
  return {
    abilities: _makeAbilitiesStructure(creatureStats, propsData.savingThrowMods, creatureProficiency),
    attributes: _makeAttributesStructure(propsData.attributes, creatureProficiency, creatureAbilities),
    details: _makeDetailsStructure(propsData.details, creatureAbilities),
    traits: _makeTraitsStructure(propsData.traits),
    skills: _makeSkillsStructure(propsData.skills, creatureProficiency, creatureStats),
    resources: _makeResourcesStructure(propsData.resources),
    spells: propsData.spellslots
  };
};

const makeDamageModifiersStructure = (parsedText) => {
  return Object.keys(parsedText).reduce((prev, key) => {
    const [left, right] = parsedText[key].split('; ');
    const keyComponents = key.toLowerCase().split(' ');
    return {
      ...prev,
      [keyComponents[0][0] + keyComponents[1][0]]: {
        value: [...left.split(', ')],
        custom: right || ''
      }
    };
  }, {
    ci: {custom: '', value: []},
    di: {custom: '', value: []},
    dr: {custom: '', value: []},
    dv: {custom: '', value: []}
  });
};

/**
 * Returns an object of all the data parsed
 *
 * @param markdownText - input text
 * @private
 */
const _makeProps = (markdownText) => {
  const sizeAndAlignment = getCreatureSizeAndAlignment(markdownText);
  const senses = getSenses(markdownText);
  const props = {
    name: getCreatureName(markdownText),
    abilities: getAbilities(markdownText),
    legendaryActions: getLegendaryActions(markdownText),
    spells: getSpells(markdownText),
    stats: getCreatureStats(markdownText),
    data: {
      savingThrowMods: getSavingThrowMods(markdownText),
      attributes: {
        armor: getCreatureACAndSource(markdownText),
        movement: getCreatureSpeed(markdownText),
        senses: senses.vision,
        hp: getCreatureHP(markdownText)
      },
      details: {
        alignment: sizeAndAlignment['alignment'],
        race: sizeAndAlignment['race'],
        challenge: getChallenge(markdownText)
      },
      traits: {
        size: sizeAndAlignment['size'],
        languages: getLanguages(markdownText).toLocaleLowerCase(),
        damageModifiers: makeDamageModifiersStructure(getDamageModifiers(markdownText)),
      },
      skills: {
        skills: getSkills(markdownText)
      },
      resources: {
        numberOfLegendaryActions: getNumberOfLegendaryActions(markdownText),
        numberOfLegendaryResistances: getNumberOfLegendaryResistances(markdownText)
      },
      spellslots: getSpellSlots(markdownText)
    }
  };
  props['proficiency'] = Math.max(Math.floor((props?.data?.details?.challenge?.CR - 1) / 4) + 2, 2);
  return props;
};

const actorCreator = async (markdownText) => {
  const props = _makeProps(markdownText);

  let actor = await Actor.create({
    name: props.name,
    type: 'npc',
    sort: 12000,
    data: _makeDataStructure(props.data, props.proficiency, props.abilities, props.stats),
    token: {
      vision: true,
      dimSight: props.data?.attributes?.senses?.darkvision ?? 0,
    },
  }, {renderSheet: true});

  if (props.abilities) await abilitiesAdder(actor, props.abilities, props.stats);
  if (props.legendaryActions) await abilitiesAdder(actor, props.legendaryActions, props.stats);
  if (props.spells) await spellsAdder(actor, props.spells);
};

export {actorCreator};
