# API Docs (DHIS2 app)

DHIS2 app that generates **OpenAPI 3.0.3 (Swagger) documentation for any tracker or event program** of the DHIS2 instance it runs on. Nothing about a specific program, tracked entity type or language is hardcoded: everything is built from the instance's own metadata.

It targets the new tracker API (`/api/tracker`), so it requires **DHIS2 2.40+** (`minDHIS2Version` in `d2.config.js`). Legacy endpoints (`/api/trackedEntityInstances`, etc.) are not documented.

## Features

- **Any program.** A selector lists the programs available to the current user. Tracker programs (with registration) and event programs (without registration) are both supported, with any tracked entity type.
- **API Reference tab.** Swagger UI in documentation mode (`Try it out` disabled) with import and query endpoints, async job endpoints, per-program schemas, example payloads and field tables.
- **Variable Mapping tab.** Every attribute and data element per stage with UID, name, type, required / unique flags, description and option sets. Collapsible sections and search by UID, name or type.
- **Download YAML.** Exports the same spec (with an absolute `servers` URL) as `<program>-openapi.<locale>.yaml` for use outside DHIS2.
- **Any DHIS2 language.** The language selector lists the locales of the instance (`/api/locales/dbLocales`). Names, descriptions and option names use DHIS2 metadata translations.
- **Translatable app text.** All fixed text can be translated through the DHIS2 DataStore (see below), with an editor tab.
- **Readable badges.** Data types and the `required` / `unique` flags are shown as coloured badges in both tabs.

## How it works

1. `src/openapi/model.js` fetches the program (tracked entity type, attributes, stages, data elements, option sets, translations) and normalizes it. Program attributes and tracked entity type attributes are merged, with mandatory flags taken per program.
2. `buildOpenApi(program, { lang, strings, baseUrl, override })` turns it into an OpenAPI document.
3. Swagger UI renders it in the app and the same object is serialised with `js-yaml` for the download.

### Generated spec

- Paths: `POST /api/tracker`, `GET /api/tracker/trackedEntities`, `/enrollments`, `/events`, `GET /api/tracker/jobs/{jobId}` and `/report`, plus a few metadata helpers. Event programs get no tracked entity or enrollment endpoints.
- Schemas per program: tracked entity, enrollment, one event schema per stage, attribute and data value items with the allowed UIDs as `enum`, payload and page schemas.
- Examples built from the metadata (mandatory fields plus a few optional ones, first option code for option sets).
- DHIS2 value types are mapped to OpenAPI types and formats in `src/openapi/valueTypes.js`.
- Field tables use markdown; the app turns type and `required` code spans into badges after rendering, so the exported YAML stays plain markdown.
- Required fields are listed in tables only, since the `attributes` / `dataValues` arrays can't enforce them in a schema. DHIS2 validates them on import.

## Translations

There are two kinds of text:

1. **Metadata** (program, stage, attribute, data element, option names and descriptions): taken from DHIS2 translations. Lookup order is the exact locale (`pt_BR`), then the base language (`pt`), then the default name.
2. **App and spec text** (headings, labels, endpoint summaries, type badge names): English and Spanish are built in (`src/i18n/defaultStrings.js`); other languages fall back to English unless translated in the DataStore.

### DataStore translations

- Namespace: `api-docs`
- Keys: `strings_<locale>`, for example `strings_pt`, `strings_pt_BR`, `strings_fr`
- Value: flat JSON object of `key: text`, using the keys from `defaultStrings.js`

```json
{
    "stages": "Etapas do programa",
    "apiReference": "Referência da API",
    "valueType_DATE": "Data"
}
```

Resolution order, later wins: English, built-in base language, built-in exact locale, DataStore base language, DataStore exact locale. A `strings_pt` key covers all `pt_*` locales and `strings_pt_BR` overrides it. Missing keys fall back to the next level.

The **Translations** tab lists every key with its English text and lets you edit the language selected in the header. It can filter untranslated keys and saves only values that differ from the built-in text. Saving needs write access to the namespace. You can also edit the keys in DHIS2's Data Store Management app.

If other users can't see translations, check the sharing of the `api-docs` namespace. Users without access see the built-in text.

### Program narrative

Optional per-program `title`, `description`, `version` and `contact`, keyed by program UID. Strings or locale maps (`{ "en": "...", "es": "..." }`; lookup tries the exact locale, the base language, then `en`).

- Bundled: `public/program-overrides.json`
- DataStore: key `program-overrides` in the `api-docs` namespace, with the same structure. It is merged on top of the bundled file per program.

## Source layout

- `src/App.jsx`: shell, program and language selection, DataStore loading, tabs.
- `src/openapi/model.js`: metadata queries and normalization, translation lookup.
- `src/openapi/buildOpenApi.js`: pure spec builder.
- `src/openapi/valueTypes.js`: value type mapping and example values.
- `src/openapi/api.js`: fetch, DataStore and YAML download helpers.
- `src/i18n/defaultStrings.js`, `src/i18n/strings.js`: text catalog and resolution.
- `src/MappingTable.jsx`, `src/TranslationsEditor.jsx`, `src/badges.js`: tabs and badge helpers.
- `public/`: app icon PNGs and `program-overrides.json`.
- `src/openapi/buildOpenApi.test.js`: unit tests.

## Development

```bash
yarn install
yarn start      # dev server
yarn test       # unit tests
yarn build      # bundle in build/bundle/
yarn deploy     # upload to a DHIS2 instance
```

To change the app icon, regenerate the PNGs from the logo (requires ImageMagick):

```bash
magick src/assets/app-logo.svg -background none -resize 48x48 public/dhis2-app-icon.png
magick src/assets/app-logo.svg -background none -resize 48x48 public/favicon-48x48.png
```

`yarn build` runs `scripts/postbuild.sh` only if it exists. That folder is git-ignored and holds an optional local pipeline, so published builds don't depend on it.

Issues, Features, etc.

Please create an [issue](https://github.com/IM-Data-PAHO/api-docs-app/issues) or a [pull](https://github.com/IM-Data-PAHO/api-docs-app/pulls) request.

Original Credits

Built with ❤️ by [MillacuraFA](https://github.com/millacurafa) for PAHO/CIM.
