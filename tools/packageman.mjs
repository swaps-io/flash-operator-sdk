#!/usr/bin/env node

/**
 * Packageman
 *
 * Script that fetches dependencies from GitHub releases.
 * Use it as preinstall script in package.json or run it manually before `yarn install`.
 *
 * Usage: ./tools/packageman.mjs
 *
 * Environment Variables:
 *   GITHUB_TOKEN — GitHub token for accessing private repositories.
 *
 * Ensure GitHub token is available in the environment or in the `.github-token` file.
 */

import fs from 'fs';
import fp from 'path';

const PACKAGES_FOLDER = './packages';
const PACKAGE_EXTENSION = 'tgz';

const GITHUB_TOKEN_ENV = 'GITHUB_TOKEN';
const GITHUB_TOKEN_PATH = '.github-token';

let githubToken;

class File {
  static async exists(path) {
    return new Promise((resolve) => {
      fs.access(path, fs.constants.F_OK, (err) => {
        const exists = err == null;
        resolve(exists);
      });
    });
  }

  static async prepareCreate(path) {
    const fileExists = await File.exists(path);
    if (fileExists) {
      return;
    }

    const directory = File._getDirectory(path);
    if (!directory) {
      return;
    }

    const directoryExists = await File.exists(directory);
    if (directoryExists) {
      return;
    }

    await File._makeDirectory(directory);
  }

  static async read(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (error, data) => {
        if (error == null) {
          resolve(data);
        } else {
          reject(new Error(error.message));
        }
      });
    });
  }

  static async readText(path) {
    const data = await File.read(path);
    const text = data.toString('utf-8');
    return text;
  }

  static async readJson(path) {
    const text = await File.readText(path);
    const json = JSON.parse(text);
    return json;
  }

  static async write(path, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, data, (error) => {
        if (error == null) {
          resolve();
        } else {
          reject(new Error(error.message));
        }
      });
    });
  }

  static _getDirectory(path) {
    return fp.parse(path).dir;
  }

  static async _makeDirectory(path) {
    return new Promise((resolve, reject) => {
      fs.mkdir(path, { recursive: true }, (error) => {
        if (error == null) {
          resolve();
        } else {
          reject(new Error(error.message));
        }
      });
    });
  }
}

class Fetch {
  static async get(url, headers) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP fetch request failed with code ${response.status}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    return data;
  }

  static async getText(url, headers) {
    const data = await Fetch.get(url, headers);
    const text = data.toString('utf-8');
    return text;
  }

  static async getJson(url, headers) {
    const text = await Fetch.getText(url, headers);
    const json = JSON.parse(text);
    return json;
  }
}

async function readPackageDependencies() {
  const packageJson = await File.readJson('package.json');
  const { dependencies, devDependencies } = packageJson;
  return { ...dependencies, ...devDependencies };
}

function isPackagemanDependency(version) {
  return version.startsWith(`${PACKAGES_FOLDER}/`) && version.endsWith(`.${PACKAGE_EXTENSION}`);
}

function parsePackagemanDependency(name, version) {
  const segments = version.split('/');
  const expectedSegments = 6;
  if (segments.length !== expectedSegments) {
    throw new Error(
      `Packageman dependency "${name}" has unexpected number of segments in its version: ` +
      `${expectedSegments} expected in format "${PACKAGES_FOLDER}/<organization>/<repository>/` +
      `<release-tag>/<artifact-filename>", but got ${segments.length} in "${version}"`
    );
  }

  const [organization, repository, release, artifact] = segments.slice(2);
  const descriptor = { name, version, organization, repository, release, artifact };
  return descriptor;
}

function checkPackagemanDependency(name, version) {
  return isPackagemanDependency(version) && parsePackagemanDependency(name, version);
}

async function readGithubToken() {
  const envToken = process.env[GITHUB_TOKEN_ENV];
  if (envToken) {
    console.log(`Using GitHub token from "${GITHUB_TOKEN_ENV}" env`);
    return envToken;
  }

  if (await File.exists(GITHUB_TOKEN_PATH)) {
    const tokenFileContent = await File.readText(GITHUB_TOKEN_PATH);
    const fileToken = tokenFileContent.trim();
    if (fileToken) {
      console.log(`Using GitHub token from "${GITHUB_TOKEN_PATH}" file`);
      return fileToken;
    }
  }

  console.log('Using no GitHub token (public deps only)');
  return '';
}

async function getGithubToken() {
  if (githubToken == null) {
    githubToken = await readGithubToken();
  }
  return githubToken;
}

function makeGithubAuthHeaders(githubToken) {
  if (!githubToken) {
    return undefined;
  }

  const headers = {
    Authorization: `token ${githubToken}`,
  };
  return headers;
}

async function fetchPackagemanDependency(descriptor) {
  const githubToken = await getGithubToken();
  const authHeaders = makeGithubAuthHeaders(githubToken);
  const baseUrl = `https://api.github.com/repos/${descriptor.organization}/${descriptor.repository}`;

  const releaseInfoHeaders = authHeaders;
  const releaseInfoUrl = `${baseUrl}/releases/tags/${descriptor.release}`;
  const releaseInfo = await Fetch.getJson(releaseInfoUrl, releaseInfoHeaders);

  const asset = releaseInfo.assets.find((asset) => asset.name === descriptor.artifact);
  if (asset == null) {
    throw new Error(
      `Artifact named "${descriptor.artifact}" does not exist in release "${descriptor.release}" ` +
      `of "${descriptor.organization}/${descriptor.repository}"`
    );
  }

  const artifactDownloadHeaders = { ...authHeaders, Accept: 'application/octet-stream' };
  const artifactDownloadUrl = `${baseUrl}/releases/assets/${asset.id}`;
  const artifactData = await Fetch.get(artifactDownloadUrl, artifactDownloadHeaders);

  await File.prepareCreate(descriptor.version);
  await File.write(descriptor.version, artifactData);
}

async function processPackagemanDependency(descriptor) {
  console.log(`Package "${descriptor.organization}/${descriptor.name}" (${descriptor.release})`);
  if (await File.exists(descriptor.version)) {
    console.log('Package already fetched');
    return;
  }

  console.log('Package is missing, fetching...');
  await fetchPackagemanDependency(descriptor);
  console.log('Package fetched');
}

async function main() {
  const dependencies = await readPackageDependencies();
  for (const [name, version] of Object.entries(dependencies)) {
    const descriptor = checkPackagemanDependency(name, version);
    if (descriptor) {
      await processPackagemanDependency(descriptor);
    }
  }
}

main();
