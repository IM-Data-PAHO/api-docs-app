export const PROGRAM_LIST_URL =
    '/api/programs.json?paging=false&order=displayName:asc&fields=id,displayName,programType';

const OPTION_SET_FIELDS = 'optionSet[id,name,options[code,name,sortOrder,translations]]';
const TEA_FIELDS = `trackedEntityAttribute[id,name,shortName,formName,description,valueType,unique,${OPTION_SET_FIELDS},translations]`;
const DE_FIELDS = `dataElement[id,name,shortName,formName,description,valueType,${OPTION_SET_FIELDS},translations]`;

export const programDetailUrl = programId =>
    `/api/programs/${encodeURIComponent(programId)}.json?fields=` +
    [
        'id',
        'name',
        'shortName',
        'description',
        'programType',
        'translations',
        'trackedEntityType[id,name,description,translations,' +
            `trackedEntityTypeAttributes[mandatory,${TEA_FIELDS}]]`,
        `programTrackedEntityAttributes[mandatory,sortOrder,${TEA_FIELDS}]`,
        'programStages[id,name,description,repeatable,sortOrder,translations,' +
            `programStageDataElements[compulsory,sortOrder,${DE_FIELDS}]]`,
    ].join(',');

const sameLocale = (a, b) => a.toLowerCase().replace('-', '_') === b.toLowerCase().replace('-', '_');
const baseOf = locale => locale.toLowerCase().split(/[_-]/)[0];

// Prefers an exact locale match (pt_BR), then any translation of the same base language (pt).
export const translate = (obj, property, lang) => {
    const candidates = (obj?.translations || []).filter(t => t.property === property && t.locale && t.value);
    const hit =
        candidates.find(t => sameLocale(t.locale, lang)) || candidates.find(t => baseOf(t.locale) === baseOf(lang));
    return hit?.value || obj?.[property.toLowerCase()] || '';
};

const normalizeOptions = (optionSet, lang) =>
    optionSet?.options
        ? [...optionSet.options]
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map(option => ({ code: option.code, name: translate(option, 'NAME', lang) }))
        : [];

const normalizeField = (source, mandatory, lang) => ({
    id: source.id,
    name: translate(source, 'NAME', lang),
    description: translate(source, 'DESCRIPTION', lang),
    valueType: source.valueType,
    unique: Boolean(source.unique),
    mandatory: Boolean(mandatory),
    optionSet: source.optionSet?.name || null,
    options: normalizeOptions(source.optionSet, lang),
});

const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

// Converts the raw DHIS2 program metadata into the structure used by the spec builder and the mapping table.
export const normalizeProgram = (raw, lang = 'en') => {
    const programAttributes = [...(raw.programTrackedEntityAttributes || [])]
        .sort(bySort)
        .filter(item => item.trackedEntityAttribute)
        .map(item => ({
            ...normalizeField(item.trackedEntityAttribute, item.mandatory, lang),
            scope: 'program',
        }));
    const known = new Set(programAttributes.map(attr => attr.id));
    const typeAttributes = (raw.trackedEntityType?.trackedEntityTypeAttributes || [])
        .filter(item => item.trackedEntityAttribute && !known.has(item.trackedEntityAttribute.id))
        .map(item => ({
            ...normalizeField(item.trackedEntityAttribute, item.mandatory, lang),
            scope: 'trackedEntityType',
        }));

    const isTracker = raw.programType === 'WITH_REGISTRATION';

    return {
        id: raw.id,
        name: translate(raw, 'NAME', lang),
        description: translate(raw, 'DESCRIPTION', lang),
        programType: raw.programType,
        isTracker,
        trackedEntityType: raw.trackedEntityType
            ? {
                  id: raw.trackedEntityType.id,
                  name: translate(raw.trackedEntityType, 'NAME', lang),
              }
            : null,
        attributes: isTracker ? [...programAttributes, ...typeAttributes] : [],
        stages: [...(raw.programStages || [])].sort(bySort).map(stage => ({
            id: stage.id,
            name: translate(stage, 'NAME', lang),
            description: translate(stage, 'DESCRIPTION', lang),
            repeatable: Boolean(stage.repeatable),
            dataElements: [...(stage.programStageDataElements || [])]
                .sort(bySort)
                .filter(item => item.dataElement)
                .map(item => normalizeField(item.dataElement, item.compulsory, lang)),
        })),
    };
};
