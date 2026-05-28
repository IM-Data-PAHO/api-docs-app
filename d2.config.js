const config = {
    type: 'app',
    name: 'vpd-api-docs',
    title: 'VPD API Docs',
    description: 'Swagger viewer for VPD Tracker API',
    minDHIS2Version: '2.40',
    entryPoints: {
        app: './src/index.jsx',
    },
};

module.exports = config;
