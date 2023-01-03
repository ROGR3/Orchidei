const fs = require('fs');
const fastFolderSizeSync = require('fast-folder-size/sync')
const args = process.argv.slice(2)
let size = fastFolderSizeSync(args[0]).toString()
console.log(size)
fs.writeFileSync(__dirname + '/folder.txt', size)