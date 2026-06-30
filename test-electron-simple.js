console.log('=== Electron module test ===');
const e = require('electron');
console.log('type:', typeof e);
console.log('keys:', Object.keys(e));
console.log('app type:', typeof e.app);
console.log('app.whenReady:', typeof e.app?.whenReady);
