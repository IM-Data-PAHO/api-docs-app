# VPD API Docs App (DHIS2)

App DHIS2 para visualizar la especificacion Swagger de VPD Tracker usando `openapi.yaml` local.

## Objetivo

- Mostrar la documentacion OpenAPI dentro de DHIS2.
- Mantener modo solo documentacion (`Try it out` deshabilitado).
- Usar rutas relativas para aprovechar autenticacion de sesion local de DHIS2.

## Fuente OpenAPI

El archivo base se sirve desde:

- `public/openapi.yaml`

## Scripts

```bash
yarn install
yarn start
yarn build
yarn deploy
```

## Notas tecnicas

- Swagger UI se inicializa con `supportedSubmitMethods: []` y `tryItOutEnabled: false`.
- Se fuerza `servers: [{ url: '/' }]` al cargar el spec para mantener rutas relativas.
- Las solicitudes usan `credentials: same-origin`.
