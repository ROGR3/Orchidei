const fs = require('fs');
const fastFolderSizeSync = require('fast-folder-size/sync')
const args = process.argv.slice(2)
fs.writeFileSync(__dirname + '/folder.txt', fastFolderSizeSync(args[0]).toString())