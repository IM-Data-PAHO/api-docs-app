import { resolveStrings } from '../i18n/strings';
import { exampleValue } from './valueTypes';

const PLACEHOLDER_UIDS = {
    trackedEntity: 'TrkEnt00001',
    enrollment: 'Enrol000001',
    event: 'Event000001',
    orgUnit: 'OrgUnit0001',
};
const EXAMPLE_DATE = '2025-01-15';
const MAX_OPTIONS_IN_TABLE = 10;
const EXAMPLE_OPTIONAL_FIELDS = 3;

const pick = (value, lang) =>
    value && typeof value === 'object'
        ? value[lang] ?? value[lang.split(/[_-]/)[0].toLowerCase()] ?? value.en ?? ''
        : value ?? '';

const escapeCell = text => String(text ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

const toIdentifier = text => {
    const words = String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean);
    return words.map(w => w[0].toUpperCase() + w.slice(1)).join('');
};

const makeKeyFactory = () => {
    const used = new Set();
    return (preferred, fallback) => {
        let key = toIdentifier(preferred) || fallback;
        if (/^[0-9]/.test(key)) {
            key = `_${key}`;
        }
        let candidate = key;
        let counter = 2;
        while (used.has(candidate)) {
            candidate = `${key}${counter++}`;
        }
        used.add(candidate);
        return candidate;
    };
};

const optionsCell = (options, t) => {
    if (!options.length) {
        return '';
    }
    const shown = options
        .slice(0, MAX_OPTIONS_IN_TABLE)
        .map(o => `\`${escapeCell(o.code)}\`${o.name && o.name !== o.code ? ` ${escapeCell(o.name)}` : ''}`);
    const rest = options.length - shown.length;
    return shown.join(', ') + (rest > 0 ? `, … +${rest} ${t.more}` : '');
};

// The type and the "required" flag are emitted as code spans; the app turns them into badges when rendering.
const fieldsTable = (fields, t) => {
    const rows = fields.map(
        f =>
            `| \`${f.id}\` | ${escapeCell(f.name)} | \`${f.valueType}\`${f.mandatory ? ' `required`' : ''} | ${optionsCell(
                f.options,
                t
            )} |`
    );
    return [`| UID | ${t.name} | ${t.type} | ${t.options} |`, '|---|---|---|---|', ...rows].join('\n');
};

const describeFields = fields =>
    fields.map(f => ({
        id: f.id,
        name: f.name,
        valueType: f.valueType,
        mandatory: f.mandatory,
        ...(f.options.length ? { options: f.options.map(o => o.code) } : {}),
    }));

const pickExampleFields = fields => {
    const mandatory = fields.filter(f => f.mandatory);
    const optional = fields.filter(f => !f.mandatory).slice(0, EXAMPLE_OPTIONAL_FIELDS);
    return fields.filter(f => mandatory.includes(f) || optional.includes(f));
};

const exampleOptionSet = field => (field.options.length ? { options: field.options } : null);

const buildFieldSchemas = ({ fields, idProperty, label, t }) => {
    const ids = fields.map(f => f.id);
    return {
        type: 'object',
        required: [idProperty, 'value'],
        description: `${label}\n\n${fieldsTable(fields, t)}`,
        'x-dhis2-fields': describeFields(fields),
        properties: {
            [idProperty]: {
                type: 'string',
                description: `${idProperty === 'attribute' ? 'Tracked entity attribute' : 'Data element'} UID.`,
                ...(ids.length ? { enum: ids } : {}),
                example: ids[0],
            },
            value: {
                description:
                    'Value, sent as a string. Format depends on the `valueType` listed in the table above (dates as `YYYY-MM-DD`, booleans as `true`/`false`, option sets use the option **code**).',
                example: fields[0] ? exampleValue(fields[0].valueType, exampleOptionSet(fields[0])) : 'value',
            },
        },
    };
};

const valueItems = (fields, idProperty) =>
    fields.map(f => ({
        [idProperty]: f.id,
        value: exampleValue(f.valueType, exampleOptionSet(f)),
    }));

const statusSchema = values => ({ type: 'string', enum: values, default: values[0] });

const ouModes = ['SELECTED', 'CHILDREN', 'DESCENDANTS', 'ACCESSIBLE', 'CAPTURE', 'ALL'];

const queryParameters = program => [
    {
        name: 'program',
        in: 'query',
        required: true,
        description: 'Program UID',
        schema: { type: 'string', default: program.id },
        example: program.id,
    },
    { name: 'orgUnit', in: 'query', description: 'Organisation unit UID', schema: { type: 'string' } },
    {
        name: 'ouMode',
        in: 'query',
        description: 'Organisation unit selection mode',
        schema: { type: 'string', enum: ouModes, default: 'DESCENDANTS' },
    },
    {
        name: 'fields',
        in: 'query',
        description: 'Fields projection, e.g. `*` or `trackedEntity,attributes`',
        schema: { type: 'string' },
    },
    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
    { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 50 } },
];

const pageSchema = (listProperty, itemRef) => ({
    type: 'object',
    properties: {
        page: { type: 'integer' },
        pageSize: { type: 'integer' },
        total: { type: 'integer' },
        [listProperty]: { type: 'array', items: { $ref: itemRef } },
        instances: {
            type: 'array',
            description: `Same content as \`${listProperty}\`, used as the list name by DHIS2 2.40.`,
            items: { $ref: itemRef },
        },
    },
});

const importReportSchemas = () => ({
    TrackerImportReport: {
        type: 'object',
        properties: {
            status: { type: 'string', enum: ['OK', 'WARNING', 'ERROR'] },
            stats: {
                type: 'object',
                properties: {
                    created: { type: 'integer' },
                    updated: { type: 'integer' },
                    deleted: { type: 'integer' },
                    ignored: { type: 'integer' },
                    total: { type: 'integer' },
                },
            },
            validationReport: {
                type: 'object',
                properties: {
                    errorReports: { type: 'array', items: { $ref: '#/components/schemas/TrackerReportEntry' } },
                    warningReports: { type: 'array', items: { $ref: '#/components/schemas/TrackerReportEntry' } },
                },
            },
        },
    },
    TrackerReportEntry: {
        type: 'object',
        properties: {
            errorCode: { type: 'string', example: 'E1085' },
            message: { type: 'string' },
            trackerType: { type: 'string', example: 'TRACKED_ENTITY' },
            uid: { type: 'string' },
        },
    },
    TrackerAsyncResponse: {
        type: 'object',
        properties: {
            httpStatus: { type: 'string' },
            httpStatusCode: { type: 'integer' },
            status: { type: 'string' },
            message: { type: 'string' },
            response: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Job UID, use it in `/api/tracker/jobs/{uid}`' },
                    location: { type: 'string' },
                },
            },
        },
    },
});

const commonParameters = () => ({
    importStrategy: {
        name: 'importStrategy',
        in: 'query',
        description: 'Import strategy',
        schema: { type: 'string', enum: ['CREATE', 'UPDATE', 'CREATE_AND_UPDATE', 'DELETE'], default: 'CREATE_AND_UPDATE' },
    },
    atomicMode: {
        name: 'atomicMode',
        in: 'query',
        description:
            '`ALL` rolls back the whole request if any object fails. `OBJECT` only rejects the failing objects.',
        schema: { type: 'string', enum: ['ALL', 'OBJECT'], default: 'ALL' },
    },
    importMode: {
        name: 'importMode',
        in: 'query',
        description: '`VALIDATE` only validates the payload, `COMMIT` persists it.',
        schema: { type: 'string', enum: ['VALIDATE', 'COMMIT'], default: 'COMMIT' },
    },
    skipRuleEngine: {
        name: 'skipRuleEngine',
        in: 'query',
        description: 'Skip program rule execution',
        schema: { type: 'boolean', default: false },
    },
    reportMode: {
        name: 'reportMode',
        in: 'query',
        description: 'Level of detail of the import report',
        schema: { type: 'string', enum: ['ERRORS', 'FULL', 'WARNINGS'], default: 'ERRORS' },
    },
    async: {
        name: 'async',
        in: 'query',
        description: 'Run the import asynchronously and return a job UID',
        schema: { type: 'boolean', default: true },
    },
});

const buildDescription = (program, t, lang, override) => {
    const lines = [];
    const custom = pick(override?.description, lang);
    if (custom) {
        lines.push(custom, '');
    } else if (program.description) {
        lines.push(program.description, '');
    }
    lines.push(`## ${t.overview}`, '');
    if (program.isTracker) {
        lines.push(
            '```',
            'TrackedEntity',
            '    └── Enrollment  (one per program)',
            '            └── Event  (one per program stage)',
            '                    └── DataValues',
            '```'
        );
    } else {
        lines.push('```', 'Event', '    └── DataValues', '```');
    }
    lines.push('', t.requirements, '', `## ${t.auth}`, '', t.authText, '');
    lines.push(
        `| | |`,
        '|---|---|',
        `| ${t.program} | ${escapeCell(program.name)} (\`${program.id}\`) |`,
        `| ${t.programType} | ${program.isTracker ? t.trackerProgram : t.eventProgram} |`
    );
    if (program.trackedEntityType) {
        lines.push(
            `| ${t.trackedEntityType} | ${escapeCell(program.trackedEntityType.name)} (\`${program.trackedEntityType.id}\`) |`
        );
    }
    if (program.stages.length) {
        lines.push('', `## ${t.stages}`, '', `| # | UID | ${t.stage} | ${t.repeatable} |`, '|---|---|---|---|');
        program.stages.forEach((stage, index) => {
            lines.push(
                `| ${index + 1} | \`${stage.id}\` | ${escapeCell(stage.name)} | ${stage.repeatable ? t.yes : t.no} |`
            );
        });
    }
    if (program.attributes.length) {
        lines.push('', `## ${t.attributes}`, '', fieldsTable(program.attributes, t));
    }
    return lines.join('\n');
};

// Builds an OpenAPI 3.0.3 document for one DHIS2 program from normalized metadata (see model.js).
export const buildOpenApi = (program, { lang = 'en', baseUrl = '/', override = null, strings = null } = {}) => {
    const t = strings || resolveStrings(lang);
    const makeKey = makeKeyFactory();
    const prefix = makeKey(program.name, 'Program');
    const hasStages = program.stages.length > 0;

    const tags = {
        import: t.tagImport,
        query: t.tagQuery,
        metadata: t.tagMetadata,
    };

    const schemas = importReportSchemas();

    const refs = {};
    const examples = {};

    if (program.isTracker) {
        const attributesKey = `${prefix}Attribute`;
        const hasAttributes = program.attributes.length > 0;
        if (hasAttributes) {
            schemas[attributesKey] = buildFieldSchemas({
                fields: program.attributes,
                idProperty: 'attribute',
                label: `${t.attributes} — ${program.name}`,
                t,
            });
        } else {
            schemas[attributesKey] = {
                type: 'object',
                required: ['attribute', 'value'],
                properties: { attribute: { type: 'string' }, value: {} },
            };
        }
        refs.attribute = { $ref: `#/components/schemas/${attributesKey}` };
    }

    const stageKeys = program.stages.map(stage => {
        const key = `${prefix}Event${makeKey(stage.name, 'Stage').replace(/^_/, '')}`;
        const dataValueKey = `${key}DataValue`;
        schemas[dataValueKey] = buildFieldSchemas({
            fields: stage.dataElements,
            idProperty: 'dataElement',
            label: `${t.dataElements} — ${stage.name}`,
            t,
        });
        const eventProperties = {
            event: { type: 'string', description: 'Event UID. Omit to generate a new one.', example: PLACEHOLDER_UIDS.event },
            program: { type: 'string', enum: [program.id], example: program.id },
            programStage: { type: 'string', enum: [stage.id], example: stage.id, description: stage.name },
            ...(program.isTracker
                ? {
                      enrollment: { type: 'string', description: 'Parent enrollment UID', example: PLACEHOLDER_UIDS.enrollment },
                      trackedEntity: { type: 'string', description: 'Parent tracked entity UID', example: PLACEHOLDER_UIDS.trackedEntity },
                  }
                : {}),
            orgUnit: { type: 'string', description: 'Organisation unit UID', example: PLACEHOLDER_UIDS.orgUnit },
            occurredAt: { type: 'string', format: 'date-time', example: `${EXAMPLE_DATE}T00:00:00.000` },
            scheduledAt: { type: 'string', format: 'date-time' },
            status: statusSchema(['ACTIVE', 'COMPLETED', 'SCHEDULE', 'OVERDUE', 'SKIPPED']),
            dataValues: { type: 'array', items: { $ref: `#/components/schemas/${dataValueKey}` } },
        };
        schemas[key] = {
            type: 'object',
            description: stage.description || stage.name,
            required: ['program', 'programStage', 'orgUnit', ...(program.isTracker ? [] : ['occurredAt'])],
            properties: eventProperties,
        };
        return { key, stage };
    });

    if (hasStages) {
        const eventRefs = stageKeys.map(({ key }) => ({ $ref: `#/components/schemas/${key}` }));
        schemas[`${prefix}Event`] = eventRefs.length === 1 ? eventRefs[0] : { oneOf: eventRefs };
    }

    if (program.isTracker) {
        schemas[`${prefix}Enrollment`] = {
            type: 'object',
            required: ['program', 'orgUnit', 'enrolledAt'],
            properties: {
                enrollment: { type: 'string', description: 'Enrollment UID. Omit to generate a new one.', example: PLACEHOLDER_UIDS.enrollment },
                program: { type: 'string', enum: [program.id], example: program.id },
                trackedEntity: { type: 'string', example: PLACEHOLDER_UIDS.trackedEntity },
                orgUnit: { type: 'string', example: PLACEHOLDER_UIDS.orgUnit },
                enrolledAt: { type: 'string', format: 'date-time', example: `${EXAMPLE_DATE}T00:00:00.000` },
                occurredAt: { type: 'string', format: 'date-time', description: 'Incident date' },
                status: statusSchema(['ACTIVE', 'COMPLETED', 'CANCELLED']),
                attributes: { type: 'array', items: refs.attribute },
                ...(hasStages
                    ? { events: { type: 'array', items: { $ref: `#/components/schemas/${prefix}Event` } } }
                    : {}),
            },
        };
        schemas[`${prefix}TrackedEntity`] = {
            type: 'object',
            description: t.mandatoryNote,
            required: ['trackedEntityType', 'orgUnit'],
            properties: {
                trackedEntity: { type: 'string', description: 'Tracked entity UID. Omit to generate a new one.', example: PLACEHOLDER_UIDS.trackedEntity },
                trackedEntityType: {
                    type: 'string',
                    enum: [program.trackedEntityType?.id].filter(Boolean),
                    description: program.trackedEntityType?.name,
                    example: program.trackedEntityType?.id,
                },
                orgUnit: { type: 'string', example: PLACEHOLDER_UIDS.orgUnit },
                attributes: { type: 'array', items: refs.attribute },
                enrollments: { type: 'array', items: { $ref: `#/components/schemas/${prefix}Enrollment` } },
            },
        };
    }

    schemas[`${prefix}Payload`] = {
        type: 'object',
        description: t.importDescription,
        properties: {
            ...(program.isTracker
                ? {
                      trackedEntities: { type: 'array', items: { $ref: `#/components/schemas/${prefix}TrackedEntity` } },
                      enrollments: { type: 'array', items: { $ref: `#/components/schemas/${prefix}Enrollment` } },
                  }
                : {}),
            ...(hasStages ? { events: { type: 'array', items: { $ref: `#/components/schemas/${prefix}Event` } } } : {}),
        },
    };

    const exampleEvent = (stage, withParents) => ({
        program: program.id,
        programStage: stage.id,
        ...(withParents
            ? { enrollment: PLACEHOLDER_UIDS.enrollment, trackedEntity: PLACEHOLDER_UIDS.trackedEntity }
            : {}),
        orgUnit: PLACEHOLDER_UIDS.orgUnit,
        occurredAt: `${EXAMPLE_DATE}T00:00:00.000`,
        status: 'COMPLETED',
        dataValues: valueItems(pickExampleFields(stage.dataElements), 'dataElement'),
    });

    if (program.isTracker) {
        const attributeValues = valueItems(pickExampleFields(program.attributes), 'attribute');
        const trackedEntity = {
            trackedEntity: PLACEHOLDER_UIDS.trackedEntity,
            trackedEntityType: program.trackedEntityType?.id,
            orgUnit: PLACEHOLDER_UIDS.orgUnit,
            attributes: attributeValues,
        };
        examples.fullCase = {
            summary: t.fullExample,
            value: {
                trackedEntities: [
                    {
                        ...trackedEntity,
                        enrollments: [
                            {
                                enrollment: PLACEHOLDER_UIDS.enrollment,
                                program: program.id,
                                orgUnit: PLACEHOLDER_UIDS.orgUnit,
                                enrolledAt: `${EXAMPLE_DATE}T00:00:00.000`,
                                status: 'ACTIVE',
                                events: program.stages.map(stage => exampleEvent(stage, false)),
                            },
                        ],
                    },
                ],
            },
        };
        examples.entitiesOnly = { summary: t.entitiesExample, value: { trackedEntities: [trackedEntity] } };
    } else if (hasStages) {
        examples.singleEvent = { summary: t.eventExample, value: { events: [exampleEvent(program.stages[0], false)] } };
    }

    const payloadRef = { $ref: `#/components/schemas/${prefix}Payload` };
    const paths = {
        '/api/tracker': {
            post: {
                tags: [tags.import],
                summary: t.importSummary,
                description: t.importDescription,
                parameters: ['importStrategy', 'atomicMode', 'importMode', 'skipRuleEngine', 'reportMode', 'async'].map(
                    name => ({ $ref: `#/components/parameters/${name}` })
                ),
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: payloadRef, examples } },
                },
                responses: {
                    200: {
                        description: t.okImport,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/TrackerImportReport' } } },
                    },
                    202: {
                        description: t.asyncAccepted,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/TrackerAsyncResponse' } } },
                    },
                    400: { description: 'Bad request' },
                    401: { description: 'Unauthorized' },
                    403: { description: 'Forbidden' },
                },
            },
        },
        '/api/tracker/jobs/{jobId}': {
            get: {
                tags: [tags.import],
                summary: t.jobStatus,
                parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Job notifications' } },
            },
        },
        '/api/tracker/jobs/{jobId}/report': {
            get: {
                tags: [tags.import],
                summary: t.jobReport,
                parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: {
                        description: 'Import report',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/TrackerImportReport' } } },
                    },
                },
            },
        },
    };

    const params = queryParameters(program);
    if (program.isTracker) {
        schemas[`${prefix}TrackedEntityPage`] = pageSchema('trackedEntities', `#/components/schemas/${prefix}TrackedEntity`);
        schemas[`${prefix}EnrollmentPage`] = pageSchema('enrollments', `#/components/schemas/${prefix}Enrollment`);
        paths['/api/tracker/trackedEntities'] = {
            get: {
                tags: [tags.query],
                summary: t.queryTEs,
                parameters: params,
                responses: {
                    200: {
                        description: t.queryTEs,
                        content: { 'application/json': { schema: { $ref: `#/components/schemas/${prefix}TrackedEntityPage` } } },
                    },
                },
            },
        };
        paths['/api/tracker/enrollments'] = {
            get: {
                tags: [tags.query],
                summary: t.queryEnrollments,
                parameters: params,
                responses: {
                    200: {
                        description: t.queryEnrollments,
                        content: { 'application/json': { schema: { $ref: `#/components/schemas/${prefix}EnrollmentPage` } } },
                    },
                },
            },
        };
    }
    if (hasStages) {
        schemas[`${prefix}EventPage`] = pageSchema('events', `#/components/schemas/${prefix}Event`);
        paths['/api/tracker/events'] = {
            get: {
                tags: [tags.query],
                summary: t.queryEvents,
                parameters: [
                    ...params,
                    {
                        name: 'programStage',
                        in: 'query',
                        description: 'Program stage UID',
                        schema: { type: 'string', enum: program.stages.map(s => s.id) },
                    },
                ],
                responses: {
                    200: {
                        description: t.queryEvents,
                        content: { 'application/json': { schema: { $ref: `#/components/schemas/${prefix}EventPage` } } },
                    },
                },
            },
        };
    }

    paths['/api/programs/{programId}'] = {
        get: {
            tags: [tags.metadata],
            summary: t.getProgram,
            parameters: [
                { name: 'programId', in: 'path', required: true, schema: { type: 'string', default: program.id } },
                { name: 'fields', in: 'query', schema: { type: 'string', example: 'id,name,programStages[id,name]' } },
            ],
            responses: { 200: { description: t.getProgram } },
        },
    };
    paths['/api/system/info'] = {
        get: { tags: [tags.metadata], summary: t.systemInfo, responses: { 200: { description: t.systemInfo } } },
    };
    paths['/api/organisationUnits'] = {
        get: {
            tags: [tags.metadata],
            summary: t.orgUnits,
            parameters: [
                { name: 'fields', in: 'query', schema: { type: 'string', example: 'id,name,level' } },
                { name: 'filter', in: 'query', schema: { type: 'string', example: 'level:eq:1' } },
                { name: 'paging', in: 'query', schema: { type: 'boolean', default: true } },
            ],
            responses: { 200: { description: t.orgUnits } },
        },
    };

    const title = pick(override?.title, lang) || `${t.titlePrefix} — ${program.name}`;

    return {
        openapi: '3.0.3',
        info: {
            title,
            description: buildDescription(program, t, lang, override),
            version: override?.version || '1.0.0',
            ...(override?.contact ? { contact: override.contact } : {}),
        },
        servers: [{ url: baseUrl }],
        security: [{ basicAuth: [] }, { apiToken: [] }],
        tags: [{ name: tags.import }, { name: tags.query }, { name: tags.metadata }],
        paths,
        components: {
            securitySchemes: {
                basicAuth: { type: 'http', scheme: 'basic' },
                apiToken: { type: 'apiKey', in: 'header', name: 'Authorization', description: 'ApiToken d2pat_…' },
            },
            parameters: commonParameters(),
            schemas,
        },
    };
};
