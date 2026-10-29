import React, { useMemo, useState } from 'react';
import { TYPE_COLORS, typeLabel } from './badges';

const TypeBadge = ({ valueType, labels }) => (
    <span className={`badge badge-${TYPE_COLORS[valueType] || 'gray'}`} title={valueType}>
        {typeLabel(valueType, labels)}
    </span>
);

const matches = (field, query) =>
    !query ||
    [field.id, field.name, field.description, field.valueType, field.optionSet]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query));

const FieldTable = ({ fields, labels }) => (
    <table className="mapping-table">
        <thead>
            <tr>
                <th>UID</th>
                <th>{labels.name}</th>
                <th>{labels.type}</th>
                <th>{labels.description}</th>
                <th>{labels.options}</th>
            </tr>
        </thead>
        <tbody>
            {fields.map(field => (
                <tr key={field.id}>
                    <td>
                        <code>{field.id}</code>
                    </td>
                    <td>{field.name}</td>
                    <td className="mapping-type-cell">
                        <TypeBadge valueType={field.valueType} labels={labels} />
                        {field.mandatory ? <span className="badge badge-red">{labels.requiredBadge}</span> : null}
                        {field.unique ? <span className="badge badge-yellow">{labels.unique}</span> : null}
                    </td>
                    <td className="mapping-description">{field.description || <span className="mapping-muted">—</span>}</td>
                    <td>
                        {field.options.length ? (
                            <details className="mapping-options">
                                <summary>
                                    {field.options.length} {labels.optionsCount} — <em>{field.optionSet}</em>
                                </summary>
                                <ul>
                                    {field.options.map(option => (
                                        <li key={option.code}>
                                            <code>{option.code}</code> {option.name}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);

const Section = ({ title, id, count, repeatable, children, labels }) => (
    <details className="mapping-section" open>
        <summary>
            <span className="mapping-section-title">{title}</span>
            {id ? <code>{id}</code> : null}
            <span className="badge badge-count">
                {count} {labels.fieldsCount}
            </span>
            {repeatable ? <span className="badge badge-orange">{labels.repeatable}</span> : null}
        </summary>
        {children}
    </details>
);

export const MappingTable = ({ program, labels }) => {
    const [search, setSearch] = useState('');
    const query = search.trim().toLowerCase();

    const attributes = useMemo(() => program.attributes.filter(f => matches(f, query)), [program, query]);
    const stages = useMemo(
        () => program.stages.map(stage => ({ ...stage, dataElements: stage.dataElements.filter(f => matches(f, query)) })),
        [program, query]
    );

    return (
        <div className="mapping">
            <div className="mapping-header">
                <h2>{program.name}</h2>
                <p>
                    <code>{program.id}</code>
                    {program.trackedEntityType ? (
                        <>
                            {' · '}
                            {labels.trackedEntityType}: <strong>{program.trackedEntityType.name}</strong> (
                            <code>{program.trackedEntityType.id}</code>)
                        </>
                    ) : null}
                </p>
                <input
                    type="search"
                    className="mapping-search"
                    placeholder={labels.search}
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                />
            </div>
            {program.attributes.length ? (
                <Section title={labels.attributes} count={attributes.length} labels={labels}>
                    <FieldTable fields={attributes} labels={labels} />
                </Section>
            ) : null}
            {stages
                .filter(stage => !query || stage.dataElements.length)
                .map(stage => (
                    <Section
                        key={stage.id}
                        title={stage.name}
                        id={stage.id}
                        count={stage.dataElements.length}
                        repeatable={stage.repeatable}
                        labels={labels}
                    >
                        {stage.dataElements.length ? <FieldTable fields={stage.dataElements} labels={labels} /> : null}
                    </Section>
                ))}
        </div>
    );
};
