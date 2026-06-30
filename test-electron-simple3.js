console.log('=== Electron module test 3 ===');
console.log('process.type:', process.type);

// Test different require paths
const tests = ['electron', 'electron/main', 'electron/common', '@electron/remote'];
for (const t of tests) {
  try {
    const m = require(t);
    console.log(`require("${t}"):`, typeof m, typeof m === 'object' ? Object.keys(m).slice(0,8).join(',') : m);
    if (typeof m === 'object' && m.app) {
      console.log(`  -> app found! whenReady:`, typeof m.app.whenReady);
    }
  } catch(e) {
    console.log(`require("${t}"): FAILED -`, e.message.substring(0, 60));
  }
}
