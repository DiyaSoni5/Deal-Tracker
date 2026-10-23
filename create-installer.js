const installer = require('electron-installer-windows');

const options = {
  src: 'dist/deal-tracker-win32-x64/',
  dest: 'dist/installers/',
  setupExe: 'Deal-Tracker-Setup.exe',
  exe: 'deal-tracker.exe',
  name: 'Deal Tracker',
  productName: 'Deal Tracker',
  version: '1.0.0',
  description: 'Broker Deal Management System',
  copyright: 'Copyright © 2024 Deal Tracker',
  authors: ['Deal Tracker Team'],
  owners: ['Deal Tracker Team'],
  noMsi: true
};

console.log('Creating installer...');

installer(options)
  .then(() => {
    console.log('Successfully created installer!');
    console.log('Installer location: dist/installers/Deal-Tracker-Setup.exe');
  })
  .catch((err) => {
    console.error('Error creating installer:', err);
  });