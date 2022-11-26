#!/usr/bin/env node

/**
 * Updates the extension verison in manifest.json and package.json
 */

const { format } = require('date-fns');
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');
const manifest = require('../manifest.json');

const stringifyJson = (json) => JSON.stringify(json, null, 2);

const newVersion = format(new Date(), 'yy.M.dd.HHmmss');

const newManifest = {
  ...manifest,
  version: newVersion,
  version_name: newVersion,
};

const newPackage = {
  ...packageJson,
  version: newVersion,
};

fs.writeFileSync(
  path.join(__dirname, '../manifest.json'),
  stringifyJson(newManifest)
);
fs.writeFileSync(
  path.join(__dirname, '../package.json'),
  stringifyJson(newPackage)
);

console.log(newVersion);
