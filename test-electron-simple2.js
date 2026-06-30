console.log('=== Electron module test 2 ===');
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);

// Try different ways to access Electron API
try { console.log('require(electron):', typeof require('electron')); } catch(e) { console.log('require(electron) FAILED:', e.message); }
try { console.log('_linkedBinding:', typeof process._linkedBinding); } catch(e) { console.log('no _linkedBinding'); }
try { 
  const m = process._linkedBinding?.('electron_browser_app');
  console.log('app binding:', m ? 'found' : 'not found');
} catch(e) { console.log('app binding FAILED'); }
