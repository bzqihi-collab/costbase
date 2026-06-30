/**
 * Startup wrapper that properly resolves the Electron built-in module
 * and stores it globally before loading the application bundle.
 */
const fs = require('fs');
const path = require('path');

// Find and temporarily hide all node_modules/electron/package.json
// so Node's module resolver skips the npm shim and finds the built-in.
const hiddenPaths = [];
function hideElectronNpm(dir) {
  while (dir && dir !== path.parse(dir).root) {
    const pkgPath = path.join(dir, 'node_modules', 'electron', 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const hiddenPath = pkgPath + '.startup_hidden';
        fs.copyFileSync(pkgPath, hiddenPath);
        fs.unlinkSync(pkgPath);
        hiddenPaths.push({ orig: pkgPath, hidden: hiddenPath });
      } catch(e) {
        // If can't hide, try to read and see if it's a symlink
      }
    }
    dir = path.dirname(dir);
  }
}

function restoreElectronNpm() {
  for (const { orig, hidden } of hiddenPaths) {
    try {
      fs.copyFileSync(hidden, orig);
      fs.unlinkSync(hidden);
    } catch(e) {}
  }
}

// Hide npm electron packages so built-in can be found
hideElectronNpm(__dirname);
// Also check home dir
hideElectronNpm(path.join(process.env.USERPROFILE || process.env.HOME || '~'));

let electron;
try {
  electron = require('electron');
  console.log('[startup] Electron module loaded, has app:', !!electron?.app);
} catch(e) {
  console.error('[startup] Failed:', e.message);
  restoreElectronNpm();
  process.exit(1);
}

// Restore npm packages immediately (built-in is now in module cache)
restoreElectronNpm();

// If we got a string (npm shim still), we have a problem
if (typeof electron === 'string') {
  console.error('[startup] Got path string instead of Electron API. Environment issue.');
  process.exit(1);
}

// Store globally for the bundled code to access
globalThis.__ELECTRON__ = electron;

// Also make sure require('electron') in child modules returns the right thing
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'electron') return globalThis.__ELECTRON__;
  return origRequire.apply(this, arguments);
};

// Now load the actual application
require('../dist-electron/main.js');
