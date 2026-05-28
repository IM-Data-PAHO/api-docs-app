import React, { useEffect, useRef, useState } from 'react';
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-es-bundle.js';
import YAML from 'js-yaml';
import 'swagger-ui-dist/swagger-ui.css';

export const App = () => {
    const [activeTab, setActiveTab] = useState('api');
    const swaggerRef = useRef(null);

    useEffect(() => {
        let ui;

        const initSwagger = async () => {
            const response = await fetch('./openapi.yaml', {
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`No se pudo cargar openapi.yaml (${response.status})`);
            }

            const rawYaml = await response.text();
            const spec = YAML.load(rawYaml);

            // Fuerza rutas relativas para usar la misma sesion de DHIS2.
            const relativeSpec = {
                ...spec,
                servers: [{ url: '/' }],
            };

            ui = SwaggerUIBundle({
                spec: relativeSpec,
                domNode: swaggerRef.current,
                deepLinking: true,
                docExpansion: 'list',
                defaultModelsExpandDepth: -1,
                validatorUrl: null,
                supportedSubmitMethods: [],
                tryItOutEnabled: false,
                persistAuthorization: true,
                requestInterceptor: req => {
                    req.credentials = 'same-origin';
                    return req;
                },
            });
        };

        initSwagger().catch(error => {
            if (swaggerRef.current) {
                swaggerRef.current.innerHTML = `<pre style=\"color:#d32f2f;padding:16px;white-space:pre-wrap;\">${error.message}</pre>`;
            }
        });

        return () => {
            if (ui && ui.specActions) {
                // No-op cleanup placeholder for future plugin hooks.
            }
        };
    }, []);

    return (
        <div className="app-shell">
            <header className="app-header">
                <h1>VPD Tracker API Docs</h1>
                <p>Modo documentacion (sin ejecucion de llamadas).</p>
                <div className="tab-bar" role="tablist" aria-label="Navegacion">
                    <button
                        type="button"
                        role="tab"
                        className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}
                        aria-selected={activeTab === 'api'}
                        onClick={() => setActiveTab('api')}
                    >
                        API Reference
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`tab-button ${activeTab === 'mapping' ? 'active' : ''}`}
                        aria-selected={activeTab === 'mapping'}
                        onClick={() => setActiveTab('mapping')}
                    >
                        Variable Mapping
                    </button>
                </div>
            </header>
            <main className="app-content">
                <section
                    role="tabpanel"
                    hidden={activeTab !== 'api'}
                    className="tab-panel"
                >
                    <div ref={swaggerRef} />
                </section>

                <section
                    role="tabpanel"
                    hidden={activeTab !== 'mapping'}
                    className="tab-panel"
                >
                    <iframe
                        title="Variable Mapping"
                        src="./metadata_reference.html"
                        className="mapping-frame"
                    />
                </section>
            </main>
        </div>
    );
};
