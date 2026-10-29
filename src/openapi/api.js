import yaml from 'js-yaml';

// DHIS2 can be served under a context path (e.g. /dhis); the app lives at <context>/api/apps/<name>/.
export const getContextPath = () => {
    const match = window.location.pathname.match(/^(.*?)\/api\/apps\//);
    return match ? match[1] : '';
};

export const apiGet = async url => {
    const response = await fetch(`${getContextPath()}${url}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} (${url})`);
    }
    return response.json();
};

// Returns null when the DataStore key does not exist (or is not readable).
export const dataStoreGet = async (namespace, key) => {
    const response = await fetch(`${getContextPath()}/api/dataStore/${namespace}/${encodeURIComponent(key)}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    });
    return response.ok ? response.json() : null;
};

export const dataStoreSave = async (namespace, key, value) => {
    const url = `${getContextPath()}/api/dataStore/${namespace}/${encodeURIComponent(key)}`;
    const send = method =>
        fetch(url, {
            method,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value),
        });
    let response = await send('PUT');
    if (response.status === 404) {
        response = await send('POST');
    }
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
};

export const dataStoreDelete = async (namespace, key) => {
    const response = await fetch(`${getContextPath()}/api/dataStore/${namespace}/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
    });
    if (!response.ok && response.status !== 404) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
};

export const toYaml = spec => yaml.dump(spec, { noRefs: true, lineWidth: -1 });

export const downloadText = (filename, text, mime = 'application/yaml') => {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
