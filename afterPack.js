const { rcedit } = require('rcedit');
const path = require('path');

exports.default = async function(context) {
  if (context.electronPlatformName === 'win32') {
    const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
    const iconPath = path.join(__dirname, 'assets', 'icon.ico');

    console.log(`Setting icon for: ${exePath}`);
    await rcedit(exePath, { icon: iconPath });
    console.log('Icon set successfully');
  }
};
