// Maps DHIS2 value types to OpenAPI schema fragments and placeholder example values.
const STRING = { type: 'string' };

const VALUE_TYPES = {
    TEXT: { schema: STRING, example: 'text' },
    LONG_TEXT: { schema: STRING, example: 'long text' },
    LETTER: { schema: { type: 'string', maxLength: 1 }, example: 'A' },
    PHONE_NUMBER: { schema: STRING, example: '+50760000000' },
    EMAIL: { schema: { type: 'string', format: 'email' }, example: 'user@example.org' },
    URL: { schema: { type: 'string', format: 'uri' }, example: 'https://example.org' },
    USERNAME: { schema: STRING, example: 'username' },
    BOOLEAN: { schema: { type: 'boolean' }, example: 'true' },
    TRUE_ONLY: { schema: { type: 'boolean', enum: [true] }, example: 'true' },
    DATE: { schema: { type: 'string', format: 'date' }, example: '2025-01-15' },
    DATETIME: { schema: { type: 'string', format: 'date-time' }, example: '2025-01-15T10:30:00.000' },
    TIME: { schema: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }, example: '10:30' },
    NUMBER: { schema: { type: 'number' }, example: '1.5' },
    UNIT_INTERVAL: { schema: { type: 'number', minimum: 0, maximum: 1 }, example: '0.5' },
    PERCENTAGE: { schema: { type: 'number', minimum: 0, maximum: 100 }, example: '50' },
    INTEGER: { schema: { type: 'integer' }, example: '1' },
    INTEGER_POSITIVE: { schema: { type: 'integer', minimum: 1 }, example: '1' },
    INTEGER_NEGATIVE: { schema: { type: 'integer', maximum: -1 }, example: '-1' },
    INTEGER_ZERO_OR_POSITIVE: { schema: { type: 'integer', minimum: 0 }, example: '0' },
    COORDINATE: { schema: STRING, example: '[-79.5, 8.98]' },
    ORGANISATION_UNIT: { schema: STRING, example: 'OrgUnit0001' },
    TRACKER_ASSOCIATE: { schema: STRING, example: 'TrkEnt00001' },
    FILE_RESOURCE: { schema: STRING, example: 'FileRes0001' },
    IMAGE: { schema: STRING, example: 'FileRes0001' },
};

const FALLBACK = { schema: STRING, example: 'value' };

export const getValueType = valueType => VALUE_TYPES[valueType] || FALLBACK;

export const openApiTypeLabel = valueType => {
    const { schema } = getValueType(valueType);
    return schema.format ? `${schema.type} (${schema.format})` : schema.type;
};

export const exampleValue = (valueType, optionSet) => {
    const firstOption = optionSet?.options?.[0]?.code;
    return firstOption !== undefined ? String(firstOption) : getValueType(valueType).example;
};
