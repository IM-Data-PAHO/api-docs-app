export const TYPE_COLORS = {
    TEXT: 'gray',
    LONG_TEXT: 'gray',
    LETTER: 'gray',
    USERNAME: 'gray',
    PHONE_NUMBER: 'gray',
    EMAIL: 'gray',
    URL: 'gray',
    INTEGER: 'blue',
    INTEGER_POSITIVE: 'blue',
    INTEGER_NEGATIVE: 'blue',
    INTEGER_ZERO_OR_POSITIVE: 'blue',
    NUMBER: 'cyan',
    UNIT_INTERVAL: 'cyan',
    PERCENTAGE: 'cyan',
    BOOLEAN: 'orange',
    TRUE_ONLY: 'orange',
    DATE: 'green',
    DATETIME: 'green',
    TIME: 'green',
    COORDINATE: 'purple',
    ORGANISATION_UNIT: 'teal',
    TRACKER_ASSOCIATE: 'teal',
    FILE_RESOURCE: 'pink',
    IMAGE: 'pink',
};

export const typeLabel = (valueType, strings) => strings[`valueType_${valueType}`] || valueType;

// Swagger UI renders markdown from the spec; turn type / required code spans inside tables into badges.
export const decorateBadges = (root, strings) => {
    root.querySelectorAll('table code:not([data-badge])').forEach(code => {
        const text = code.textContent.trim();
        const color = TYPE_COLORS[text];
        if (color) {
            code.dataset.badge = '1';
            code.className = `badge badge-${color}`;
            code.title = text;
            code.textContent = typeLabel(text, strings);
        } else if (text === 'required') {
            code.dataset.badge = '1';
            code.className = 'badge badge-red';
            code.textContent = strings.requiredBadge;
        }
    });
};
