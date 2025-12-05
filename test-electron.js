console.log('Testing electron require...');
try {
  const electron = require('electron');
  console.log('Electron module type:', typeof electron);
  console.log('Electron module keys:', Object.keys(electron));
  console.log('app:', electron.app);
  console.log('BrowserWindow:', electron.BrowserWindow);
} catch (e) {
  console.error('Error:', e.message);
}
