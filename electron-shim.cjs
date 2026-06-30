// electron-shim.cjs
// Properly resolves the Electron built-in module, working around
// the node_modules/electron npm package shadowing issue.
//
// When running inside Electron, the built-in 'electron' module should be used.
// When running outside Electron (build time), we export a stub.

const path = require('path');
const fs = require('fs');
const Module = require('module');

// Save the original resolve function
const originalResolveFilename = Module._resolveFilename;

// Temporarily hide node_modules/electron so the built-in takes precedence
function getElectronBuiltin() {
  const electronDir = path.join(__dirname, 'node_modules', 'electron');
  const indexPath = path.join(electronDir, 'index.js');
  const pkgPath = path.join(electronDir, 'package.json');

  if (fs.existsSync(indexPath)) {
    // Hide the npm shim
    try { fs.renameSync(indexPath, indexPath + '.tmp_hidden'); } catch(e) {}
  }
  if (fs.existsSync(pkgPath)) {
    try { fs.renameSync(pkgPath, pkgPath + '.tmp_hidden'); } catch(e) {}
  }

  let result;
  try {
    // Now require("electron") should find the built-in
    result = require('electron');
  } catch(e) {
    // If built-in not found, try common paths
    try {
      // Try Electron's common module
      result = require('electron/common');
    } catch(e2) {
      // Fallback
      result = {};
    }
  }

  // Restore the npm shim
  if (fs.existsSync(indexPath + '.tmp_hidden')) {
    try { fs.renameSync(indexPath + '.tmp_hidden', indexPath); } catch(e) {}
  }
  if (fs.existsSync(pkgPath + '.tmp_hidden')) {
    try { fs.renameSync(pkgPath + '.tmp_hidden', pkgPath); } catch(e) {}
  }

  return result;
}

// Export the real Electron API
module.exports = getElectronBuiltin();
