import React, { useMemo, useState } from 'react';
import { builtInStrings, TRANSLATION_KEYS } from './i18n/strings';

// Edits the DataStore overrides for one language. Only values that differ from the built-in text are saved.
export const TranslationsEditor = ({ locale, localeName, stored, strings, onSave }) => {
    const defaults = useMemo(() => builtInStrings(locale), [locale]);
    const english = useMemo(() => builtInStrings('en'), []);
    const [draft, setDraft] = useState(() => ({ ...stored }));
    const [onlyMissing, setOnlyMissing] = useState(false);
    const [message, setMessage] = useState(null);

    const isEnglish = locale.split('_')[0] === 'en';
    const isMissing = key => !draft[key] && defaults[key] === english[key] && !isEnglish;
    const keys = TRANSLATION_KEYS.filter(key => !onlyMissing || isMissing(key));

    const submit = async () => {
        const cleaned = {};
        Object.entries(draft).forEach(([key, value]) => {
            const text = (value || '').trim();
            if (text && text !== defaults[key]) {
                cleaned[key] = text;
            }
        });
        try {
            await onSave(cleaned);
            setMessage({ ok: true, text: strings.saved });
        } catch (error) {
            setMessage({ ok: false, text: `${strings.saveError}: ${error.message}` });
        }
    };

    return (
        <div className="translations">
            <p>{strings.translationsHint}</p>
            <p>
                {strings.translationsFor}: <strong>{localeName}</strong> (<code>{locale}</code>)
            </p>
            <label className="translations-filter">
                <input type="checkbox" checked={onlyMissing} onChange={event => setOnlyMissing(event.target.checked)} />{' '}
                {strings.showMissing}
            </label>
            <table className="mapping-table">
                <thead>
                    <tr>
                        <th>{strings.translationKey}</th>
                        <th>{strings.translationDefault}</th>
                        <th>{strings.translationValue}</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.map(key => (
                        <tr key={key}>
                            <td>
                                <code>{key}</code>
                            </td>
                            <td className="mapping-description">{english[key]}</td>
                            <td>
                                <textarea
                                    className="translations-input"
                                    rows={english[key].length > 80 ? 3 : 1}
                                    placeholder={defaults[key]}
                                    value={draft[key] || ''}
                                    onChange={event => setDraft({ ...draft, [key]: event.target.value })}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="translations-actions">
                <button type="button" className="tab-button active" onClick={submit}>
                    {strings.save}
                </button>
                {message ? <span className={message.ok ? 'translations-ok' : 'app-error'}>{message.text}</span> : null}
            </div>
        </div>
    );
};
