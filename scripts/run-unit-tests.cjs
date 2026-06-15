const Module = require('node:module');
const path = require('node:path');
const Mocha = require('mocha');

const originalLoad = Module._load;

class TestUri {
  constructor(scheme, authority, pathValue) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = pathValue;
  }

  static file(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return new TestUri('file', '', normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`);
  }

  static joinPath(baseUri, ...pathSegments) {
    const joinedPath = [baseUri.path.replace(/\/+$/, ''), ...pathSegments].join('/').replace(/\/+/g, '/');
    return new TestUri(baseUri.scheme, baseUri.authority, joinedPath);
  }

  static from(components) {
    return new TestUri(components.scheme, components.authority ?? '', components.path ?? '/');
  }

  toString() {
    return `${this.scheme}://${this.authority}${this.path}`;
  }
}

const vscodeStub = {
  Uri: TestUri,
  FileType: {
    File: 1,
    Directory: 2
  },
  workspace: {
    getConfiguration() {
      return {
        get(_key, defaultValue) {
          return defaultValue;
        }
      };
    },
    fs: {}
  },
  window: {},
  commands: {},
  ProgressLocation: {
    Notification: 15
  }
};

Module._load = function loadWithVscodeStub(request, parent, isMain) {
  if (request === 'vscode') {
    return vscodeStub;
  }

  return originalLoad.call(this, request, parent, isMain);
};

const mocha = new Mocha({
  color: true,
  ui: 'tdd'
});
const testsRoot = path.resolve(__dirname, '..', 'out', 'test', 'suite');

for (const testFile of ['language.test.js', 'markdown.test.js', 'cache.test.js', 'translation.test.js']) {
  mocha.addFile(path.join(testsRoot, testFile));
}

mocha.run((failures) => {
  process.exitCode = failures > 0 ? 1 : 0;
});
