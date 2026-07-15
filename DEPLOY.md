# Deploying to a Test Server

How to build a release of **Wicked Campaigns** (`cv-wicked-campaigns`) and get it running on
a separate Foundry install for testing.

## 1. Build the release ZIP

On this dev machine, in the module folder:

```
npm run release 
```

This compiles `packs/_source/*.json` into the compiled compendium packs and zips everything a
player needs into `dist\cv-wicked-campaigns-v<version>.zip`. The ZIP already contains the
compiled packs, so **the test machine needs no Node.js or npm** - it's a self-contained module
folder.

(First time only: run `npm install` once in this folder before `npm run release` works.)

## 2. Transfer the ZIP

Copy `dist\cv-wicked-campaigns-v<version>.zip` to the test machine however you normally move
files - USB drive, network share, cloud drive, etc.

## 3. Find the test server's modules folder

On the test machine, this is `<Foundry user data path>\Data\modules\`. If you don't know that
path, Foundry's setup/configuration screen shows "Data Path", or check whatever
shortcut/command is used to launch it there.

## 4. Extract into the right folder name

This is the one gotcha: most zip tools create a folder named after the ZIP itself (e.g.
`cv-wicked-campaigns-v14.0.0\`), but Foundry needs the folder name to exactly match the
module's `id` in `module.json`.

- If `Data\modules\cv-wicked-campaigns\` already exists from a previous test, delete it first
  so nothing stale lingers.
- Extract the ZIP, then make sure the result is `Data\modules\cv-wicked-campaigns\` directly
  containing `module.json` - not nested a level too deep, and not still named after the
  version. Rename the extracted folder if needed.

## 5. Restart the test server

Restart it (or start it if it wasn't running) so it picks up the new/updated module folder.

## 6. Enable the module

In the test world, go to **Manage Modules**, enable **Wicked Campaigns**, click
**Save Module Settings**, and let it reload.

## Troubleshooting

- **Module doesn't show up in Manage Modules**: the folder name under `Data\modules\` doesn't
  match the `id` field in `module.json` (`cv-wicked-campaigns`), or `module.json` isn't
  directly inside that folder (extracted one level too deep).
- **Compendiums show up empty**: you copied `packs/_source` instead of using the built release
  ZIP. Always deploy from `dist\*.zip`, not a raw copy of the dev folder - the compiled packs
  only exist after `npm run release`/`npm run pack`.

## Bumping the version

Both this module and its ZIP filename are versioned off `module.json`'s `version` field. Bump
it before building a new test release if you want to tell builds apart at a glance - otherwise
a new `npm run release` will just overwrite the same `dist\cv-wicked-campaigns-v14.0.0.zip`.
