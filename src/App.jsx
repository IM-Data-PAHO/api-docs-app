import React, { useEffect, useMemo, useRef, useState } from 'react';
import i18n from '@dhis2/d2-i18n';
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-es-bundle.js';
import 'swagger-ui-dist/swagger-ui.css';
import { decorateBadges } from './badges';
import { baseLocale, DATASTORE_NAMESPACE, normalizeLocale, OVERRIDES_KEY, resolveStrings, stringsKey } from './i18n/strings';
import { MappingTable } from './MappingTable';
import { TranslationsEditor } from './TranslationsEditor';
import {
    apiGet,
    dataStoreDelete,
    dataStoreGet,
    dataStoreSave,
    downloadText,
    getContextPath,
    toYaml,
} from './openapi/api';
import { buildOpenApi } from './openapi/buildOpenApi';
import { normalizeProgram, PROGRAM_LIST_URL, programDetailUrl } from './openapi/model';

const LANGUAGE_KEY = 'api-docs-lang';
const PROGRAM_KEY = 'api-docs-program';

const normalizeLanguage = normalizeLocale;

const readStorage = key => {
    try {
        return window.localStorage.getItem(key);
    } catch (error) {
        return null;
    }
};

const writeStorage = (key, value) => {
    try {
        window.localStorage.setItem(key, value);
    } catch (error) {
        // Ignore storage errors.
    }
};

const getStoredLanguage = () => {
    const stored = readStorage(LANGUAGE_KEY);
    return stored ? normalizeLanguage(stored) : null;
};

const extractDhis2Language = payload => {
    const direct = payload?.keyUiLocale;
    const settingsLocale = payload?.settings?.keyUiLocale;
    const userSettingsLocale = payload?.userSettings?.keyUiLocale;
    return normalizeLanguage(direct || settingsLocale || userSettingsLocale || 'en');
};

const slugify = text =>
    String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

export const App = () => {
    const [language, setLanguage] = useState(() => getStoredLanguage() || normalizeLanguage(i18n.language));
    const [tab, setTab] = useState('api');
    const [programs, setPrograms] = useState(null);
    const [programId, setProgramId] = useState(() => readStorage(PROGRAM_KEY) || '');
    const [rawProgram, setRawProgram] = useState(null);
    const [overrides, setOverrides] = useState({});
    const [locales, setLocales] = useState([]);
    const [stored, setStored] = useState({});
    const [error, setError] = useState(null);
    const swaggerRef = useRef(null);
    const hasStoredLanguage = getStoredLanguage() !== null;

    useEffect(() => {
        if (hasStoredLanguage) {
            return;
        }

        const loadDhis2UserLanguage = async () => {
            try {
                const me = await apiGet('/api/me.json?fields=keyUiLocale,settings[keyUiLocale],userSettings[keyUiLocale]');
                setLanguage(extractDhis2Language(me));
            } catch (loadError) {
                // Keep fallback language.
            }
        };

        loadDhis2UserLanguage();
    }, [hasStoredLanguage]);

    useEffect(() => {
        apiGet('/api/locales/dbLocales.json')
            .then(data => setLocales(Array.isArray(data) ? data : data.locales || []))
            .catch(() => setLocales([]));
    }, []);

    // Translations stored in the DataStore: one key per locale, loaded for the base language and the exact locale.
    useEffect(() => {
        let cancelled = false;
        const wanted = [...new Set(['en', baseLocale(language), language])];
        Promise.all(
            wanted.map(locale =>
                dataStoreGet(DATASTORE_NAMESPACE, stringsKey(locale))
                    .catch(() => null)
                    .then(value => [locale, value])
            )
        ).then(entries => {
            if (!cancelled) {
                setStored(current => ({
                    ...current,
                    ...Object.fromEntries(entries.filter(([, value]) => value && typeof value === 'object')),
                }));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [language]);

    // Optional per-program narrative (title, description, contact): bundled file, extended by the DataStore.
    useEffect(() => {
        const bundled = fetch('./program-overrides.json')
            .then(response => (response.ok ? response.json() : {}))
            .catch(() => ({}));
        const remote = dataStoreGet(DATASTORE_NAMESPACE, OVERRIDES_KEY).catch(() => null);
        Promise.all([bundled, remote]).then(([local, fromStore]) => {
            const merged = { ...(local || {}) };
            Object.entries(fromStore || {}).forEach(([id, value]) => {
                merged[id] = { ...merged[id], ...value };
            });
            setOverrides(merged);
        });
    }, []);

    useEffect(() => {
        apiGet(PROGRAM_LIST_URL)
            .then(data => {
                const list = data.programs || [];
                setPrograms(list);
                setProgramId(current => (list.some(p => p.id === current) ? current : list[0]?.id || ''));
            })
            .catch(loadError => {
                setPrograms([]);
                setError(loadError.message);
            });
    }, []);

    useEffect(() => {
        if (!programId) {
            setRawProgram(null);
            return undefined;
        }
        let cancelled = false;
        setError(null);
        setRawProgram(null);
        apiGet(programDetailUrl(programId))
            .then(data => {
                if (!cancelled) {
                    setRawProgram(data);
                }
            })
            .catch(loadError => {
                if (!cancelled) {
                    setError(loadError.message);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [programId]);

    const labels = useMemo(() => resolveStrings(language, stored), [language, stored]);
    const program = useMemo(() => (rawProgram ? normalizeProgram(rawProgram, language) : null), [rawProgram, language]);
    const contextPath = getContextPath();

    const spec = useMemo(
        () =>
            program
                ? buildOpenApi(program, {
                      lang: language,
                      strings: labels,
                      baseUrl: contextPath || '/',
                      override: overrides[program.id] || null,
                  })
                : null,
        [program, language, labels, overrides, contextPath]
    );

    useEffect(() => {
        if (!spec || !swaggerRef.current) {
            return;
        }
        const container = swaggerRef.current;
        container.innerHTML = '';
        const observer = new MutationObserver(() => decorateBadges(container, labels));
        observer.observe(container, { childList: true, subtree: true });
        try {
            SwaggerUIBundle({
                spec,
                domNode: swaggerRef.current,
                deepLinking: false,
                docExpansion: 'list',
                defaultModelsExpandDepth: -1,
                validatorUrl: null,
                supportedSubmitMethods: [],
                tryItOutEnabled: false,
                persistAuthorization: true,
            });
        } catch (renderError) {
            setError(renderError.message);
        }
        return () => observer.disconnect();
    }, [spec, labels]);

    const onSelectLanguage = selectedLanguage => {
        const normalized = normalizeLanguage(selectedLanguage);
        setLanguage(normalized);
        writeStorage(LANGUAGE_KEY, normalized);
    };

    const onSelectProgram = event => {
        setProgramId(event.target.value);
        writeStorage(PROGRAM_KEY, event.target.value);
    };

    const onDownload = () => {
        const exportSpec = buildOpenApi(program, {
            lang: language,
            strings: labels,
            baseUrl: `${window.location.origin}${contextPath}`,
            override: overrides[program.id] || null,
        });
        downloadText(`${slugify(program.name) || program.id}-openapi.${language}.yaml`, toYaml(exportSpec));
    };

    const onSaveTranslations = async values => {
        if (Object.keys(values).length) {
            await dataStoreSave(DATASTORE_NAMESPACE, stringsKey(language), values);
        } else {
            await dataStoreDelete(DATASTORE_NAMESPACE, stringsKey(language));
        }
        setStored(current => ({ ...current, [language]: values }));
    };

    const languageOptions = useMemo(() => {
        const byCode = new Map([['en', 'English']]);
        locales.forEach(item => byCode.set(normalizeLanguage(item.locale), item.name || item.locale));
        if (!byCode.has(language)) {
            byCode.set(language, language);
        }
        return [...byCode].sort((a, b) => a[1].localeCompare(b[1]));
    }, [locales, language]);

    const status = programs === null ? labels.loadingPrograms : !programs.length ? labels.noPrograms : null;

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="header-top">
                    <h1>{labels.appTitle}</h1>
                    <select
                        className="language-select"
                        aria-label={labels.language}
                        value={language}
                        onChange={event => onSelectLanguage(event.target.value)}
                    >
                        {languageOptions.map(([code, name]) => (
                            <option key={code} value={code}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
                <p>{labels.docsMode}</p>
                <div className="program-bar">
                    <label htmlFor="program-select">{labels.program}</label>
                    <select id="program-select" value={programId} onChange={onSelectProgram} disabled={!programs?.length}>
                        {!programId ? <option value="">{labels.selectProgram}</option> : null}
                        {(programs || []).map(item => (
                            <option key={item.id} value={item.id}>
                                {item.displayName}
                            </option>
                        ))}
                    </select>
                    <button type="button" className="tab-button" onClick={onDownload} disabled={!program}>
                        {labels.download}
                    </button>
                </div>
                <div className="tab-bar" role="tablist" aria-label={labels.navigation}>
                    <button
                        type="button"
                        role="tab"
                        className={`tab-button ${tab === 'api' ? 'active' : ''}`}
                        aria-selected={tab === 'api'}
                        onClick={() => setTab('api')}
                    >
                        {labels.apiReference}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`tab-button ${tab === 'mapping' ? 'active' : ''}`}
                        aria-selected={tab === 'mapping'}
                        onClick={() => setTab('mapping')}
                    >
                        {labels.variableMapping}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`tab-button ${tab === 'translations' ? 'active' : ''}`}
                        aria-selected={tab === 'translations'}
                        onClick={() => setTab('translations')}
                    >
                        {labels.translationsTab}
                    </button>
                </div>
            </header>
            <main className="app-content">
                {status ? <p>{status}</p> : null}
                {error ? <pre className="app-error">{error}</pre> : null}
                {programId && !program && !error ? <p>{labels.loadingProgram}</p> : null}
                <section role="tabpanel" className="tab-panel" hidden={tab !== 'api'}>
                    <div ref={swaggerRef} />
                </section>
                {tab === 'mapping' && program ? (
                    <section role="tabpanel" className="tab-panel">
                        <MappingTable program={program} labels={labels} />
                    </section>
                ) : null}
                {tab === 'translations' ? (
                    <section role="tabpanel" className="tab-panel">
                        <TranslationsEditor
                            key={language}
                            locale={language}
                            localeName={languageOptions.find(([code]) => code === language)?.[1] || language}
                            stored={stored[language] || {}}
                            strings={labels}
                            onSave={onSaveTranslations}
                        />
                    </section>
                ) : null}
            </main>
        </div>
    );
};
