const config = {
    type: 'app',
    name: 'api-docs',
    title: 'API Docs',
    description: 'Swagger viewer for DHIS2 Tracker API',
    minDHIS2Version: '2.40',
    entryPoints: {
        app: './src/index.jsx',
    },
};

module.exports = config;
