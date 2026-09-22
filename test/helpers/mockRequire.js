// Minimal CommonJS module-boundary mocking: replace what `require(name)`
// resolves to before the module under test is required, and restore it
// afterwards. Avoids pulling in a mocking library or hitting real
// OpenAI/GitHub/Redis/Postgres from the test suite.
// `name` must already be resolvable from the caller's own require.resolve
// (call it as mockModule(require.resolve('some-module'), fakeExports)) so
// relative specifiers resolve against the test file, not this helper.
function mockModule(resolvedPath, fakeExports) {
  const previous = require.cache[resolvedPath];

  require.cache[resolvedPath] = {
    id: resolvedPath,
    filename: resolvedPath,
    loaded: true,
    exports: fakeExports,
  };

  return function restore() {
    if (previous) {
      require.cache[resolvedPath] = previous;
    } else {
      delete require.cache[resolvedPath];
    }
  };
}

// Force the next `require(name)` to re-evaluate the module file instead of
// returning a cached copy — needed when a module under test reads mocked
// constants from another module at require time.
// `resolvedPath` must already be resolved via the caller's own require.resolve.
function uncacheModule(resolvedPath) {
  delete require.cache[resolvedPath];
}

module.exports = { mockModule, uncacheModule };
