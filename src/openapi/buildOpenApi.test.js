import yaml from 'js-yaml';
import { buildOpenApi } from './buildOpenApi';
import { resolveStrings } from '../i18n/strings';
import { normalizeProgram } from './model';

const optionSet = {
    id: 'OptSet00001',
    name: 'Yes/No',
    options: [
        { code: 'YES', name: 'Yes', sortOrder: 1, translations: [{ property: 'NAME', locale: 'es', value: 'Si' }] },
        { code: 'NO', name: 'No', sortOrder: 2 },
    ],
};

const trackerProgram = {
    id: 'Prog0000001',
    name: 'Mi Programa | Test',
    programType: 'WITH_REGISTRATION',
    translations: [{ property: 'NAME', locale: 'es', value: 'Programa de prueba' }],
    trackedEntityType: {
        id: 'TetPerson01',
        name: 'Person',
        trackedEntityTypeAttributes: [
            { mandatory: true, trackedEntityAttribute: { id: 'AttrName001', name: 'Name', valueType: 'TEXT' } },
            { mandatory: false, trackedEntityAttribute: { id: 'AttrOnlyTet1', name: 'Only TET', valueType: 'INTEGER' } },
        ],
    },
    programTrackedEntityAttributes: [
        {
            mandatory: true,
            sortOrder: 1,
            trackedEntityAttribute: { id: 'AttrName001', name: 'Name', valueType: 'TEXT' },
        },
        {
            mandatory: false,
            sortOrder: 2,
            trackedEntityAttribute: { id: 'AttrBirth01', name: 'Birth date', valueType: 'DATE' },
        },
    ],
    programStages: [
        {
            id: 'Stage000002',
            name: 'Laboratorio',
            sortOrder: 2,
            repeatable: true,
            programStageDataElements: [
                { compulsory: false, dataElement: { id: 'DeResult001', name: 'Result', valueType: 'TEXT', optionSet } },
            ],
        },
        {
            id: 'Stage000001',
            name: 'Vaccination History',
            sortOrder: 1,
            programStageDataElements: [
                { compulsory: true, dataElement: { id: 'DeDoses0001', name: 'Doses', valueType: 'INTEGER_ZERO_OR_POSITIVE' } },
            ],
        },
    ],
};

const eventProgram = {
    id: 'Prog0000002',
    name: 'Event Only',
    programType: 'WITHOUT_REGISTRATION',
    programStages: [
        {
            id: 'Stage000003',
            name: 'Single',
            programStageDataElements: [
                { compulsory: true, dataElement: { id: 'DeFlag00001', name: 'Flag', valueType: 'TRUE_ONLY' } },
            ],
        },
    ],
};

const build = (raw, options = {}) => buildOpenApi(normalizeProgram(raw, options.lang), options);

describe('normalizeProgram', () => {
    it('merges program and tracked entity type attributes without duplicates', () => {
        const program = normalizeProgram(trackerProgram);
        expect(program.attributes.map(a => a.id)).toEqual(['AttrName001', 'AttrBirth01', 'AttrOnlyTet1']);
        expect(program.attributes[0].mandatory).toBe(true);
        expect(program.attributes[2].scope).toBe('trackedEntityType');
    });

    it('orders stages and uses DHIS2 translations', () => {
        const program = normalizeProgram(trackerProgram, 'es');
        expect(program.stages.map(s => s.id)).toEqual(['Stage000001', 'Stage000002']);
        expect(program.name).toBe('Programa de prueba');
        expect(program.stages[1].dataElements[0].options[0].name).toBe('Si');
    });

    it('matches exact locale first, then base language, then falls back to the default name', () => {
        const raw = {
            ...eventProgram,
            name: 'Default',
            translations: [
                { property: 'NAME', locale: 'pt', value: 'Portugues' },
                { property: 'NAME', locale: 'pt_BR', value: 'Brasileiro' },
                { property: 'NAME', locale: 'fr', value: 'Francais' },
            ],
        };
        expect(normalizeProgram(raw, 'pt_BR').name).toBe('Brasileiro');
        expect(normalizeProgram(raw, 'pt_PT').name).toBe('Portugues');
        expect(normalizeProgram(raw, 'fr').name).toBe('Francais');
        expect(normalizeProgram(raw, 'de').name).toBe('Default');
    });

    it('ignores attributes for event programs', () => {
        expect(normalizeProgram(eventProgram).attributes).toEqual([]);
    });
});

describe('buildOpenApi', () => {
    it('generates tracker paths and program specific schemas', () => {
        const spec = build(trackerProgram);
        expect(spec.openapi).toBe('3.0.3');
        expect(Object.keys(spec.paths)).toEqual(
            expect.arrayContaining(['/api/tracker', '/api/tracker/trackedEntities', '/api/tracker/enrollments', '/api/tracker/events'])
        );
        expect(Object.keys(spec.paths).some(p => p.includes('trackedEntityInstances'))).toBe(false);
        const te = spec.components.schemas.MiProgramaTestTrackedEntity;
        expect(te.properties.trackedEntityType.enum).toEqual(['TetPerson01']);
        expect(spec.components.schemas.MiProgramaTestAttribute.properties.attribute.enum).toEqual([
            'AttrName001',
            'AttrBirth01',
            'AttrOnlyTet1',
        ]);
    });

    it('builds a full example with mandatory fields and option codes', () => {
        const spec = build(trackerProgram);
        const example = spec.paths['/api/tracker'].post.requestBody.content['application/json'].examples.fullCase.value;
        const enrollment = example.trackedEntities[0].enrollments[0];
        expect(enrollment.events).toHaveLength(2);
        expect(enrollment.events[1].dataValues[0]).toEqual({ dataElement: 'DeResult001', value: 'YES' });
    });

    it('supports event programs without tracked entities', () => {
        const spec = build(eventProgram);
        expect(spec.paths['/api/tracker/trackedEntities']).toBeUndefined();
        expect(spec.paths['/api/tracker/events']).toBeDefined();
        expect(spec.components.schemas.EventOnlyPayload.properties.trackedEntities).toBeUndefined();
    });

    it('applies language, base url and overrides', () => {
        const spec = build(trackerProgram, {
            lang: 'es',
            baseUrl: 'https://example.org/dhis',
            override: { title: { es: 'Titulo', en: 'Title' }, description: 'Narrativa' },
        });
        expect(spec.info.title).toBe('Titulo');
        expect(spec.info.description).toContain('Narrativa');
        expect(spec.servers).toEqual([{ url: 'https://example.org/dhis' }]);
        expect(spec.info.description).toContain('Etapas del programa');
    });

    it('falls back to English static text for locales without a bundled catalog', () => {
        const spec = build(trackerProgram, { lang: 'pt_BR' });
        expect(spec.info.description).toContain('Program stages');
    });

    it('layers DataStore translations over the built-in text', () => {
        const strings = resolveStrings('pt_BR', { pt: { stages: 'Etapas' }, pt_BR: { stages: 'Fases do programa' } });
        expect(strings.stages).toBe('Fases do programa');
        expect(resolveStrings('pt_BR', { pt: { stages: 'Etapas' } }).stages).toBe('Etapas');
        expect(resolveStrings('es', { es: { auth: 'Acceso' } }).auth).toBe('Acceso');
        expect(resolveStrings('es').stages).toBe('Etapas del programa');
        expect(resolveStrings('de').stages).toBe('Program stages');
        const spec = build(trackerProgram, { lang: 'pt_BR', strings });
        expect(spec.info.description).toContain('Fases do programa');
    });

    it('produces YAML that round-trips', () => {
        const spec = build(trackerProgram);
        const text = yaml.dump(spec, { noRefs: true, lineWidth: -1 });
        expect(yaml.load(text)).toEqual(JSON.parse(JSON.stringify(spec)));
    });
});
