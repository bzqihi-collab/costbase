var e = require('electron');
console.log('type:', typeof e);
if (typeof e === 'object') {
  console.log('app type:', typeof e.app);
  console.log('BrowserWindow type:', typeof e.BrowserWindow);
}
