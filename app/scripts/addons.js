function isInList(str, arr) {
  for (let i = 0; i < arr.length; i++)
    if (arr[i].name === str)
      return true
  return false
}

async function getFilesizeInBytes(_filePath) {
  try {
    let { size } = fs.statSync(_filePath);
    return size;
  } catch (err) {
    return 0;
  }
}


function replaceToMakePath(_filePath, _space) {
  return _filePath.replace(_space, '%20').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function convertBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  if (bytes == 0) {
    return 'N/A';
  }

  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

  if (i == 0) {
    return bytes + ' ' + sizes[i];
  }

  return (bytes / Math.pow(1000, i)).toFixed(1) + ' ' + sizes[i];
}


async function createFileFromPath(_filePath) {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(_filePath, (err, data) => {
        if (err) throw err;
        const file = new File([data], _filePath.split("/").pop());
        resolve(file);
      });
    } catch (error) {
      reject(error);
    }
  });
}