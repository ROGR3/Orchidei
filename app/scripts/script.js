const { ipcRenderer, shell } = require('electron');
const remote = require('@electron/remote')
const { exec, spawn } = require('child_process');
const { lookpath } = require('lookpath');
const { ncp } = require('ncp');
const trashCommand = require('trash');
const fs = require('fs');
const os = require("os")

require("dotenv").config()

let { max_ls_length, start_path, safe_mode } = require('../setting.json');

const SPAWN_FILE = __dirname + '/../temp/spawn.js'
const TEMP_FOLDER_FILE = __dirname + '/../temp/folder.txt'

const SPACE_SYMBOL = 'idkssppccidk';
const SPACE_REGEX = new RegExp(`${SPACE_SYMBOL}`, 'g');
const HOME_DIR = os.homedir()
const MAX_SHARE_SIZE = 21_000_000

const currentPathDiv = document.querySelector('.currentPath');
const body = document.querySelector('body');
const foldersMenu = document.querySelector('.foldersMenu');
const recentFoldersSpan = document.querySelector('#recentFolders');
const recentFilesSpan = document.querySelector('#recentFiles');
const searchForFoldersSpan = document.querySelector('#searchForFolders');
const sortByHeading = document.querySelector('.sortByHeading');
const sizeSort = document.querySelector('.size');
const azSort = document.querySelector('.atoz');
const goBackIcon = document.querySelector('.iconLeft');
const goFrontIcon = document.querySelector('.iconRight');
const copyIcon = document.querySelector('.copy');
const searchIcon = document.querySelector('.glass');
const searchInput = document.querySelector('#searchInput');


let currentPath = start_path;
let lastPath = currentPath;
let currentFiles = [];
let currentFilesSizes = [];
let lastFilesArr = JSON.parse(localStorage.getItem('lastShow'))
  ? JSON.parse(localStorage.getItem('lastShow')).lastFiles
  : [];
let lastFoldersArr = JSON.parse(localStorage.getItem('lastShow'))
  ? JSON.parse(localStorage.getItem('lastShow')).lastFolders
  : [];
let searchFoldersArr = ['Documents', 'Downloads', 'Desktop', 'Music', 'Pictures', 'Videos'];
let isSortedBySize = false;
let isSortedByAlph = false;

let rightClickDiv = '';
let soloNode = '';

let copiedFile = '';
let copiedFileName = '';


function addToLast(fileString, isFolder) {
  if (isInList(fileString, isFolder ? lastFoldersArr : lastFilesArr)) return

  if (isFolder) {
    lastFoldersArr.unshift({ currentPath: currentPath, name: fileString });
    lastFoldersArr.length = max_ls_length;
  } else {
    lastFilesArr.unshift({ currentPath: currentPath + '/' + fileString, name: fileString });
    lastFilesArr.length = max_ls_length;
  }

  localStorage.setItem('lastShow', JSON.stringify({ lastFolders: lastFoldersArr, lastFiles: lastFilesArr }));
}


function sortByAplh(currentFiles) {
  currentFiles.forEach((el) => (el = el.toLowerCase()));
  if (isSortedByAlph) {
    azSort.style.backgroundImage = "url('../assets/icons/azsortdown.png')";
    currentFiles.sort();
    sortByHeading.innerHTML = `${curLang.singles.sortedBy}: A-Z`;
  } else {
    azSort.style.backgroundImage = "url('../assets/icons/azsortup.png')";
    currentFiles.reverse();
    sortByHeading.innerHTML = `${curLang.singles.sortedBy}: A-Z`;
  }
  sizeSort.style.backgroundImage = "url('../assets/icons/sizesortup1.png')";
  isSortedBySize = false;
  isSortedByAlph = !isSortedByAlph;

  createUI(currentFiles);
}
function sortBySize(currentFilesSizes, isNew) {
  isNew == 'yes' ? (isSortedBySize = false) : 0;
  if (!isSortedBySize) {
    sizeSort.style.backgroundImage = "url('../assets/icons/sizesortdown.png')";
    currentFilesSizes = currentFilesSizes.sort((a, b) => {
      return a.size - b.size;
    });
    sortByHeading.innerHTML = `${curLang.singles.sortedBy}: ${curLang.singles.size}`;
  } else {
    sizeSort.style.backgroundImage = "url('../assets/icons/sizesortup.png')";
    currentFilesSizes.reverse();
    sortByHeading.innerHTML = `${curLang.singles.sortedBy}: ${curLang.singles.size}`;
  }
  azSort.style.backgroundImage = "url('../assets/icons/azsortdown1.png')";

  isSortedByAlph = false;
  createUI(currentFilesSizes);
  isSortedBySize = !isSortedBySize;
}


function createUI(currentFiles) {
  if (currentPath.length > 40) {
    currentPathDiv.innerHTML = currentPath.replace(/\//g, '\\').slice(0, 37) + '...';
  } else {
    currentPathDiv.innerHTML = currentPath.replace(/\//g, '\\');
  }
  if (currentFiles[0]) {
    if (typeof currentFiles[0] == 'object') {
      foldersMenu.innerHTML = '';
      currentFiles.forEach((file) => {
        createSingleElementUI(file.name);
      });
    } else {
      foldersMenu.innerHTML = '';
      currentFiles.forEach((file) => {
        createSingleElementUI(file);
      });
    }
  } else {
    foldersMenu.innerHTML = `<p style="position: absolute;left: 45%;margin-top: 20px;"> ${curLang.singles.emptyFolder}</p> `;
  }
}
function createSingleElementUI(file) {
  let fileOrFolder = isFile(file);

  let pathClass = file;

  if (file.length > 15) {
    file = file.substring(0, 15) + '...';
  }

  let el = document.createElement('div');
  el.classList.add('solo');
  if (pathClass) {
    pathClass = pathClass.replace(/ /g, SPACE_SYMBOL);
    el.classList.add(pathClass);
  }
  el.draggable = true;
  el.innerHTML = `
    <div class="soloImg ${fileOrFolder}" ></div>
    <p class="soloText">${file}</p>
  `;

  if (isFile(pathClass) == 'file') {
    el.querySelector('.soloImg').style.backgroundImage = initImage(pathClass, true);
  } else if (isFile(pathClass) == 'locked-folder') {
    el.querySelector('.soloImg').style.backgroundImage = 'url(../assets/folders/lockedFolder.png)';
  } else {
    el.querySelector('.soloImg').style.backgroundImage = initImage(pathClass, false);
  }

  foldersMenu.appendChild(el);
  el.addEventListener('click', async (e) => {
    handleSelectDiv(e);
  });
  el.addEventListener('dblclick', async (e) => {
    await handleClicks(e);
  });
}

async function handleClicks(e) {
  lastPath = currentPath;
  let newPath = e;
  if (typeof e != 'string') {
    newPath = e.target.classList.value.includes('solo ')
      ? e.target.classList.value
        .replace(/solo |solo/, '')
        .replace(SPACE_REGEX, ' ')
        .replace('selected', '')
      : e.target.parentNode.classList.value
        .replace(/solo |solo/, '')
        .replace(SPACE_REGEX, ' ')
        .replace(' selected', '');
  }
  if (newPath.endsWith(' ')) newPath = newPath.slice(0, -1);
  if (isFile(newPath) == 'file') {
    try {
      setTimeout(() => handleWaitAnim(true), 200);
      await shell.openPath(currentPath + '/' + newPath);
      handleWaitAnim(false);
      setTimeout(() => handleWaitAnim(false), 200);
      addToLast(newPath, false);
      initLeftHTMLBar();
    } catch (err) {
      handleWaitAnim(false);
      handleErr(err);
      if (err.toString().includes('operation not permitted')) {
        popMsgBox('No Windows Permision', '45%', '45%');
      } else if (err.toString().includes('no such file or directory')) {
        popMsgBox('File ' + newPath + ' does not exists', '45%', '45%');
      } else {
        popMsgBox('Error', '45%', '45%');
      }
    }
  } else {
    let lPath = currentPath;
    try {
      currentPath = currentPath + '/' + newPath;
      addToLast(newPath, true);
      handleChangePath();
    } catch (err) {
      currentPath = lPath;
      handleErr(err);
      if (err.toString().includes('operation not permitted')) {
        popMsgBox('No Windows Permision', '45%', '45%');
      } else if (err.toString().includes('no such file or directory')) {
        popMsgBox('File ' + newPath + ' does not exists', '45%', '45%');
      } else {
        popMsgBox('Error', '45%', '45%');
      }
    }
  }
}

function popMsgBox(txt, x, y) {
  let el = document.createElement('div');
  el.classList.add('popUpBox');
  el.classList.add('fadeIn');
  el.innerHTML = `<p>${txt}</p>`;
  el.style.top = y;
  el.style.left = x;
  setTimeout(() => {
    el.classList.add('fadeOut');
    el.addEventListener('animationend', () => {
      el.remove();
    });
  }, 500);
  body.appendChild(el);
}

function rlyWant(txt, x, y, file) {
  let el = document.createElement('div');
  el.classList.add('popUpBox');
  el.style.backgroundColor = 'rgb(68, 65, 71)';
  el.classList.add('fadeIn');
  el.innerHTML = `<p>${txt}</p>`;
  el.style.top = y;
  el.style.left = x;
  setTimeout(() => {
    el.addEventListener('click', () => {
      el.classList.add('fadeOut');
      el.addEventListener('animationend', () => {
        el.remove();
      });
      deleteFile(file);
      popMsgBox('Deleted file ' + file, '45%', '45%');
      return;
    });
    document.addEventListener(
      'click',
      () => {
        el.remove();
        return;
      },
      { once: true }
    );
  }, 500);

  body.appendChild(el);
}

function handleChangePath() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
  initLeftHTMLBar();
  currentPath = currentPath.replace(/\/\//g, '/');
  currentFiles = [];
  currentFilesSizes = [];
  fs.readdirSync(currentPath).forEach((file) => {
    currentFiles.push(file);
  });
  searchInput.value = '';
  fs.readdir(currentPath, async (err, files) => {
    if (err) {
      handleErr(err);
      createUI(currentFiles);
      handleSingleDrag();
    } else {
      await files.forEach(async (file) => {
        currentFilesSizes.push({ name: file, size: await getFilesizeInBytes(currentPath + '/' + file) });
      });
      sortBySize(currentFilesSizes, 'yes');
      handleSingleDrag();
    }
  });
}


function addListeners() {
  let newInpCounter = 0;
  goBackIcon.addEventListener('click', () => {
    goBack();
  });
  goFrontIcon.addEventListener('click', () => {
    currentPath = lastPath;
    handleChangePath();
    handleSingleDrag();
  });
  azSort.addEventListener('click', () => sortByAplh(currentFiles));
  sizeSort.addEventListener('click', () => sortBySize(currentFilesSizes));
  copyIcon.addEventListener('click', () => {
    navigator.clipboard.writeText(currentPath);
    popMsgBox('Copied to clipboard', '85%', '10%');
  });
  searchIcon.addEventListener('click', filterSearch);
  window.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
      case 'enter':
        if (document.querySelector('.newInp') == document.activeElement) {
          let renamingFile = document.querySelector('.newInp').placeholder;
          if (renamingFile != 'File.txt') {
            let lastprip = renamingFile.split('.');
            let renamedName = document.querySelector('.newInp').value.includes('.')
              ? currentPath + '/' + document.querySelector('.newInp').value
              : currentPath + '/' + document.querySelector('.newInp').value + '.' + lastprip[lastprip.length - 1];
            fs.rename(currentPath + '/' + renamingFile, renamedName, function (err) {
              if (err) handleErr(err);
            });
          } else {
            let renamedName = document.querySelector('.newInp').value.includes('.')
              ? currentPath + '/' + document.querySelector('.newInp').value
              : currentPath + '/' + document.querySelector('.newInp').value + '.txt';
            newInpCounter++;
            fs.writeFile(renamedName, '', (err) => {
              if (err) handleErr(err);
            });
          }

          changeBgOpacity('');
          document.querySelector('.newInp').remove();
          handleChangePath();
        } else {
          if (lastSelectedEl[0] && !lastSelectedEl[1]) {
            let openedFile =
              currentPath + '/' + lastSelectedEl[0].classList.value.replace('solo ', '').replace(' selected', '');
            if (isFile(openedFile) == 'file') {
              try {
                shell.openPath(openedFile);
              } catch (err) {
                haddleErr(err);
              }
            } else {
              let lPath = currentPath;
              try {
                currentPath = openedFile;
                handleChangePath();
              } catch (err) {
                currentPath = lPath;
                if (err.toString().includes('operation not permitted')) {
                  popMsgBox('No Permision', '45%', '45%');
                } else {
                  handleErr(err);
                  popMsgBox('Error', '45%', '45%');
                }
              }
            }
          } else {
            if (!document.querySelector('.propertiesBox')) {
              searchInput.focus();
              filterSearch();
            }
          }
        }
        break;
      case 'delete':
        if (lastSelectedEl[0]) {
          for (let i = 0; i < lastSelectedEl.length; ++i) {
            let delFile = lastSelectedEl[i].classList.value.replace('solo ', '').replace(' selected', '');
            if (safe_mode) {
              rlyWant(
                'Are you sure u want to delete ' + delFile + '? <br/> <span>(Click on me to delete!)</span>',
                '45%',
                '45%',
                delFile
              );
            } else {
              deleteFile(delFile);
            }
          }
          lastSelectedEl = [];
        }
        break;
      case 'escape':
        goBack();
        break;
    }
    if (!document.querySelector('.newInp') && !document.querySelector('.propertiesBox')) {
      searchInput.focus();
    }
  });

  foldersMenu.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (rightClickDiv) {
      rightClickDiv.remove();
      soloNode.classList.remove('selected');
    }
    if (document.querySelector('.newInp')) {
      changeBgOpacity('');
      document.querySelector('.newInp').remove();
    }

    handleRightClick(e.x, e.y, e);
  });
  document.addEventListener('click', (ev) => {
    let elTarget = ev.target.classList.value.includes('solo ') ? ev.target : ev.target.parentNode;
    if (elTarget.classList) {
      if (!elTarget.classList.value.includes('solo ')) {
        if (lastSelectedEl[0]) {
          for (let i = 0; i < lastSelectedEl.length; ++i) {
            lastSelectedEl[i].classList.remove('selected');
          }
          lastSelectedEl = [];
        }
      }
    }

    if (rightClickDiv) {
      rightClickDiv.remove();
      soloNode.classList.remove('selected');
    }
    if (document.querySelector('.newInp')) {
      newInpCounter++;
      if (newInpCounter % 2 == 0) {
        changeBgOpacity('');
      }
    }
  });
}

function filterSearch() {
  if (!searchInput.value) {
    handleChangePath();
  }
  if (searchInput.value == 'orchsettings') {
    createSetting();
  }
  currentFiles = currentFiles.filter((el) => {
    return el.toLowerCase().includes(searchInput.value.toLowerCase());
  });
  currentFilesSizes = currentFilesSizes.filter((el) => {
    return el.name.toLowerCase().includes(searchInput.value.toLowerCase());
  });
  createUI(currentFiles);
}
function initLeftHTMLBar() {
  searchForFoldersSpan.innerHTML = '';
  for (let i = 0; i < searchFoldersArr.length; i++) {
    let el = document.createElement('h3');
    el.classList.add('title');
    el.setAttribute('id', HOME_DIR + '/' + searchFoldersArr[i].toLowerCase());
    el.innerHTML = searchFoldersArr[i];
    el.addEventListener('click', async (e) => {
      await handleLeftBarClick(e);
    });
    searchForFoldersSpan.appendChild(el);
  }

  recentFoldersSpan.innerHTML = '';
  lastFoldersArr.length = max_ls_length;
  for (let i = 0; i < lastFoldersArr.length; i++) {
    if (lastFoldersArr[i] != null) {
      let el = document.createElement('h3');
      el.classList.add('title');
      el.setAttribute('id', lastFoldersArr[i].currentPath);
      if (lastFoldersArr[i].name.length > 14) {
        el.innerHTML = lastFoldersArr[i].name.toLowerCase().slice(0, 11) + '...';
      } else {
        el.innerHTML = lastFoldersArr[i].name.toLowerCase();
      }
      el.addEventListener('click', async (e) => {
        await handleLeftBarClick(e);
      });
      recentFoldersSpan.appendChild(el);
    }
  }
  recentFilesSpan.innerHTML = '';
  lastFilesArr.length = max_ls_length;
  for (let i = 0; i < lastFilesArr.length; i++) {
    if (lastFilesArr[i] != null) {
      let el = document.createElement('h3');
      el.classList.add('title');
      el.setAttribute('id', lastFilesArr[i].currentPath);
      if (lastFilesArr[i].name.length > 14) {
        el.innerHTML = lastFilesArr[i].name.toLowerCase().slice(0, 11) + '...';
      } else {
        el.innerHTML = lastFilesArr[i].name.toLowerCase();
      }
      el.addEventListener('click', async (e) => {
        await handleLeftBarClick(e);
      });
      recentFilesSpan.appendChild(el);
    }
  }
}

function handleWindowMove() {
  const currentWindow = remote.getCurrentWindow();

  currentWindow.on('will-move', function () {
    changeBgOpacity(0);
  });
  currentWindow.on('moved', function () {
    if (document.querySelector('.propertiesBox')) {
      changeBgOpacity('.1');
    } else {
      changeBgOpacity('');
    }
  });
}

function firstCall() {
  handleClose();
  handleChangePath();
  addListeners();
  handleLang();
  initLeftHTMLBar();
  handleWindowMove();
  handleSingleDrag();
  handleCommandsStorage();
}

function handleLeftBarClick(el) {
  if (isFile(el.target.id) == 'file') {
    try {
      shell.openPath(el.target.id);
    } catch (err) {
      haddleErr(err);
    }
  } else {
    let lPath = currentPath;
    try {
      currentPath = el.target.id;
      handleChangePath();
    } catch (err) {
      currentPath = lPath;
      if (err.toString().includes('operation not permitted')) {
        popMsgBox('No Permision', '45%', '45%');
      } else {
        handleErr(err);
        if (err.toString().includes('operation not permitted')) {
          popMsgBox('No Windows Permision', '45%', '45%');
        } else if (err.toString().includes('no such file or directory')) {
          popMsgBox('File does not exists', '45%', '45%');
        } else {
          popMsgBox('Error', '45%', '45%');
        }
      }
    }
  }
}

function initImage(file, isFilePassed) {
  let res = '';
  if (isFilePassed) {
    let fileSplit = file.split('.');
    switch (fileSplit[fileSplit.length - 1]) {
      case 'jpg':
      case 'jpeg':
      case 'jfif':
      case 'png':
      case 'svg':
        res = replaceToMakePath(currentPath + "/" + file, SPACE_REGEX);
        break;
      case 'mp3':
        res = 'audio.png';
        break;
      case 'ini':
        res = 'ini.png';
        break;
      case 'html':
      case 'htm':
        res = 'html.png';
        break;
      case 'css':
      case 'scss':
        res = 'css.png';
        break;
      case 'js':
        res = 'js.png';
        break;
      case 'py':
        res = 'py.png';
        break;
      case 'bin':
        res = 'bin.png';
        break;
      case 'sys':
        res = 'sys.png';
        break;
      case 'c':
        res = 'c.png';
        break;
      case 'csx':
      case 'cs':
        res = 'cs.png';
        break;
      case 'cc':
      case 'cpp':
      case 'cp':
      case 'c++':
      case 'cxx':
      case 'C':
        res = 'cpp.png';
        break;
      case 'mp4':
      case 'mkv':
      case 'avi':
      case 'wlmp':
        res = 'movie.png';
        break;
      case 'dll':
        res = 'dll.png';
        break;
      case 'pdf':
        res = 'pdf.png';
        break;
      case 'dll':
        res = 'dll.png';
        break;
      case 'zip':
      case 'rar':
      case 'gz':
        res = 'zip.png';
        break;
      case 'exe':
        res = 'exe.png';
        break;
      case 'iso':
        res = 'iso.png';
        break;
      case 'ppt':
      case 'pot':
      case 'potx':
      case 'potm':
      case 'pps':
      case 'ppsx':
      case 'ppsm':
      case 'ppam':
      case 'pptx':
      case 'sldx':
      case 'sldm':
        res = 'ppt.png';
        break;
      case 'xls':
      case 'xlsm':
      case 'xll':
      case 'xlam':
      case 'xla':
      case 'xlsx':
      case 'xlt':
      case 'xltm':
      case 'xltx':
        res = 'xls.png';
        break;
      case 'doc':
      case 'docx':
        res = 'doc.png';
        break;
      case 'txt':
        res = 'txt.png';
        break;
      case 'ttf':
        res = 'ttf.png';
        break;
      case 'srt':
        res = 'srt.png';
        break;
      default:
        res = 'file.png';
        break;
    }
    if (res[1] == ':') {
      return `url(${res})`;
    }
    return `url(../assets/files/${res})`;
  }
  switch (file.toLowerCase()) {
    case 'downloads':
      res = 'downloads.png';
      break;
    case 'music':
      res = 'music.png';
      break;
    case 'pictures':
      res = 'photos.png';
      break;
    case 'documents':
      res = 'documents.png';
      break;
    case 'desktop':
      res = 'desktop.png';
      break;
    case 'videos':
      res = 'videos.png';
      break;
    case 'extensions':
      res = 'extensions.png';
      break;
    case 'logs':
      res = 'logs.png';
      break;
    case 'libraries':
      res = 'libraries.png';
      break;
    case 'public':
      res = 'public.png';
      break;
    case 'storage':
      res = 'storage.png';
      break;
    case 'users':
      res = 'user.png';
      break;
    case 'windows':
      res = 'windows.png';
      break;
    case '$recycle.bin':
    case '$recycle bin':
    case 'recycle bin':
    case 'bin':
      res = 'bin.png';
      break;
    default:
      res = 'folder.png';
      break;
  }
  return `url(../assets/folders/${res})`;
}


function handleSingleDrag() {
  let solos = document.querySelectorAll('.solo');
  solos.forEach((el) => {
    let draggedPath = currentPath + '/' + el.classList[1];
    el.ondragstart = (event) => {
      event.preventDefault();
      let logoPath = el.childNodes[1].style.backgroundImage.includes('url(".')
        ? el.childNodes[1].style.backgroundImage.replace('url(".', '').replace('")', '')
        : './assets/icons/orchideiMini.png';

      ipcRenderer.send('ondragstart', draggedPath, logoPath);
    };
    el.ondrop = (event) => {
      event.preventDefault();
      event.stopPropagation();
      let elPlaced = event.target.classList.value.includes('solo ')
        ? event.target.classList.value.replace(/solo |solo/, '').replace(SPACE_REGEX, ' ')
        : event.target.parentNode.classList.value.replace(/solo |solo/, '').replace(SPACE_REGEX, ' ');
      let elGrabbed = event.dataTransfer.files[0].path.replace(/\\/g, '/');
      if (currentPath + '/' + elPlaced != elGrabbed) {
        if (isFile(elGrabbed) == 'file') {
          if (isFile(elPlaced) == 'file') {
            fs.copyFile(elGrabbed, currentPath + '/' + elGrabbed.split('/').pop(), (err) => {
              if (err) return handleErr(err);
              handleChangePath();
              popMsgBox('Copied ' + elGrabbed.split('/').pop(), '45%', '45%');
            });
          } else if (isFile(elPlaced) == 'folder') {
            fs.copyFile(elGrabbed, currentPath + '/' + elPlaced + '/' + elGrabbed.split('/').pop(), (err) => {
              if (err) return handleErr(err);
              handleChangePath();
              popMsgBox('Copied ' + elGrabbed.split('/').pop(), '45%', '45%');
            });
          }
        } else if (isFile(elGrabbed) == 'folder') {
          if (isFile(elPlaced) == 'file') {
            setTimeout(() => handleWaitAnim(true), 200);
            ncp(elGrabbed, currentPath + '/' + elGrabbed.split('/').pop(), function (err) {
              if (err) return handleErr(err);
              handleWaitAnim(false);
              setTimeout(() => handleWaitAnim(false), 200);
              handleChangePath();
              popMsgBox('Copied ' + elGrabbed.split('/').pop(), '45%', '45%');
            });
          } else if (isFile(elPlaced) == 'folder') {
            setTimeout(() => handleWaitAnim(true), 200);
            ncp(elGrabbed, currentPath + '/' + elPlaced + '/' + elGrabbed.split('/').pop(), function (err) {
              if (err) return handleErr(err);
              handleWaitAnim(false);
              setTimeout(() => handleWaitAnim(false), 200);
              handleChangePath();
              popMsgBox('Copied ' + elGrabbed.split('/').pop(), '45%', '45%');
            });
          }
        }
      } else {
        console.log('same on same');
      }
    };
  });
}

function handleRightClick(x, y, test) {
  let elementClicked = test.target.classList.value.includes('solo ')
    ? test.target.classList.value.replace(/solo |solo/, '').replace(SPACE_REGEX, ' ')
    : test.target.parentNode.classList.value.replace(/solo |solo/, '').replace(SPACE_REGEX, ' ');
  soloNode = test.target.classList.value.includes('solo ')
    ? test.target
    : test.target.classList.value.includes('foldersMenu')
      ? test.target
      : test.target.parentNode;

  soloNode.classList.add('selected');

  let choiceArr = ['Open', 'Copy Path', 'Copy', 'Paste', 'Delete', 'Rename', 'Properties', "Share"];
  if (elementClicked == 'menus') {
    choiceArr = ['Copy Path', 'New File', 'Properties', "Recieve"];
  }
  let isCode = localStorage.getItem('code');
  if (isCode) {
    choiceArr.splice(1, 0, 'VS Code');
  }
  rightClickDiv = document.createElement('div');
  rightClickDiv.classList.add('rightClickBox');
  let liString = '';
  for (let i = 0; i < choiceArr.length; ++i) {
    liString += `<li class="sololi" onclick="handleSingleLiClick(this.innerText.toLowerCase(),'${elementClicked}')">${choiceArr[i]}</li>`;
  }
  rightClickDiv.innerHTML = `<ul class="soloul">
  ${liString}
  </ul>`;
  let posY = y;
  let posX = x;
  if (y + getHeight(rightClickDiv) >= window.innerHeight) {
    posY = y - getHeight(rightClickDiv);
    rightClickDiv.style.border = ' 1px solid white';
    rightClickDiv.style.borderBottomLeftRadius = 0;
  } else {
    rightClickDiv.style.borderTopLeftRadius = 0;
  }
  if (x + getWidth(rightClickDiv) >= window.innerWidth) {
    posX = x - getWidth(rightClickDiv);
    rightClickDiv.style.border = ' 1px solid white';
    rightClickDiv.style.borderTopRightRadius = 0;
  } else {
    rightClickDiv.style.borderTopLeftRadius = 0;
  }
  rightClickDiv.style.top = posY + 'px';
  rightClickDiv.style.left = posX + 'px';

  body.appendChild(rightClickDiv);
}
async function handleSingleLiClick(command, clickedEl) {
  clickedEl = clickedEl.replace(' selected', '');
  switch (command.toLowerCase()) {
    case 'open':
    case 'run':
      await handleClicks(clickedEl);
      break;
    case 'copy':
      copyFile(clickedEl);
      popMsgBox('Copied File ' + clickedEl, '45%', '45%');
      break;
    case 'copy path':
      clickedEl == 'menus'
        ? navigator.clipboard.writeText(currentPath)
        : navigator.clipboard.writeText(currentPath + '/' + clickedEl);
      popMsgBox('Copied to clipboard', '45%', '45%');
      break;
    case 'paste':
      await insertFile(clickedEl);
      popMsgBox('Pasted File ' + createFileWithCopy(clickedEl), '45%', '45%');
      break;
    case 'delete':
      if (safe_mode) {
        rlyWant(
          'Are you sure u want to delete ' + clickedEl + '? <br/> <span>(Click on me to delete!)</span>',
          '45%',
          '45%',
          clickedEl
        );
      } else {
        deleteFile(clickedEl);
      }
      break;
    case 'rename':
      renameFile(clickedEl);
      break;
    case 'properties':
      properties(clickedEl);
      break;
    case 'vs code':
      openInCode(clickedEl);
      break;
    case 'new file':
      createFile(clickedEl);
      break;
    case "share":
      shareFile(clickedEl)
      break;
    case "recieve":
      recieveFile(clickedEl)
      break;
  }
}

function recieveFile(fileName) {
  let el = document.createElement('div');
  el.classList.add('propertiesBox');
  el.innerHTML = `
    <div class="smallHead">
    <p>Recieve file</p>
    </div>
    <div class="smallBody">
      <div class="row">
        <input type="text" placeholder="Enter your hash" id="hashInput"/>

      </div>
      <div class="lineB"></div>
      <button id="downloadBtn" onclick="downloadFile()">Download</button>
    </div>
  `;

  el.placeholder = fileName;
  changeBgOpacity(0.1);
  body.appendChild(el);

  setTimeout(() => {
    document.addEventListener('click', handleInfoClose);
    function handleInfoClose(e) {
      let targetIds = e.path.map(t => t.className).join(" ")
      if (!targetIds.includes("propertiesBox")) {
        changeBgOpacity('');
        el.remove();
        document.removeEventListener("click", handleInfoClose)
      }
    }
  }, 500);
}

async function downloadFile() {
  let _hash = document.getElementById("hashInput").value
  const URL = process.env.SERVER_URL
  const INFO_PATH = process.env.SERVER_INFO_PATH
  const DOWNLOAD_PATH = process.env.SERVER_DOWNLOAD_PATH

  let fileInfo = await fetch(URL + INFO_PATH + _hash).then(res => res.json())
  fetch(URL + DOWNLOAD_PATH + _hash)
    .then(resp => resp.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileInfo.file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove()
    })
    .catch((err) => console.log('Error: ' + err));
}

function shareFile(fileName) {
  let el = document.createElement('div');
  el.classList.add('propertiesBox');

  let imgURL =
    isFile(fileName) == 'locked-folder'
      ? '../assets/folders/lockedFolder.png'
      : initImage(fileName, isFile(fileName) == 'file').replace('url(', '').replace(')', '');

  let fpName = fileName ? fileName.length > 25 ? fileName.slice(0, 25) + '...' : fileName : currentPath.split("/").pop();

  el.innerHTML = `
    <div class="smallHead">
    <img src="${imgURL}" width="20px"/>  <p> ${fpName} - Share file</p>
    </div>
    <div class="smallBody">
      <div class="row">
        <img src="${imgURL}" width="50px"/>
        <h3>${fpName}</h3>
      </div>
      <div class="lineB"></div>
      <p>${curLang.singles.location} ${currentPath}</p>
      <div class="lineB"></div>
      <p>
      Delete after 
        <select name="downloadSelect" id="downloadSelect">
          <option value="1">1 Download</option>
          <option value="2">2 Download</option>
          <option value="5">5 Download</option>
          <option value="10">10 Download</option>
        </select>
        days
      </p>
      <div class="lineB"></div>
      <section id="beforeShare">
        <input type="file" id="filesInput" onchange=handleShareSelectUI() >
        <label for="filesInput" id="uploadLable">Click here to select File</label>               
        <div class="lineB"></div>
        <button id="shareBtn" onclick=startSharing()>Share</button>
      </section>
      <section id="afterShare">
        <p>File shared succesfully</p>
        <div class="lineB"></div>
        <p>Your secret hash is: </p>
        <p id="responseHash"></p>
        <div id="copyHash" onclick="copyHashCode()"></div>
      </section>

    </div>
  `;


  el.placeholder = fileName;
  changeBgOpacity(0.1);
  body.appendChild(el);
  setTimeout(() => {
    document.addEventListener('click', handleInfoClose);
    function handleInfoClose(e) {
      let targetIds = e.path.map(t => t.className).join(" ")
      if (!targetIds.includes("propertiesBox")) {
        changeBgOpacity('');
        el.remove();
        document.removeEventListener("click", handleInfoClose)
      }
    }
  }, 500);
}

function copyHashCode() {
  navigator.clipboard.writeText(document.getElementById("responseHash").innerText)
  popMsgBox('Copied to clipboard', '45%', '45%');
}

function handleShareSelectUI() {
  let selectedFileName = document.getElementById('filesInput').value
  if (!selectedFileName) {
    document.getElementById('uploadLable').innerText = "Click here to select File";
    document.getElementById('shareBtn').style.display = "none";
  } else {
    document.getElementById('uploadLable').innerText = selectedFileName;
    document.getElementById('shareBtn').style.display = "inline-block";
  }

}

async function startSharing() {
  const file = document.getElementById("filesInput").files
  if (file[0].size > MAX_SHARE_SIZE) {
    document.getElementById("beforeShare").innerHTML += "<p>Your file is too big. Max file limit is " + convertBytes(MAX_SHARE_SIZE) + "</p>"
    return
  }
  const formData = new FormData()
  let sel = document.getElementById("downloadSelect")
  formData.append("file", file[0]);
  formData.append("maxDownloads", sel.value);
  const URL = process.env.SERVER_URL
  const UPLOAD_PATH = process.env.SERVER_UPLOAD_PATH
  const response = await fetch(URL + UPLOAD_PATH, {
    method: "POST",
    body: formData
  }).then(res => res.json())

  document.getElementById("beforeShare").style.display = "none"
  document.getElementById("afterShare").style.display = "block"
  document.getElementById("responseHash").innerText = response.hash
  console.log(response)
}

function copyFile(fileName) {
  copiedFile = currentPath + '/' + fileName;
  copiedFileName = fileName;
}

function insertFile(fileName) {
  let adddedCopy = createFileWithCopy(fileName);
  fs.copyFile(copiedFile, currentPath + '/' + adddedCopy, (err) => {
    if (err) {
      handleErr(err);
    }
    handleChangePath();
  });
}

function deleteFile(fileName) {
  (async () => {
    if (isFile(currentPath + '/' + fileName) == 'folder') {
      setTimeout(() => handleWaitAnim(true), 200);
      await trashCommand(currentPath + '/' + fileName);
      handleWaitAnim(false);
      setTimeout(() => {
        handleWaitAnim(false);
        popMsgBox('Deleted ' + fileName, '45%', '45%');
      }, 200);
      handleChangePath();
    } else {
      await trashCommand(currentPath + '/' + fileName);
      popMsgBox('Deleted ' + fileName, '45%', '45%');
      handleChangePath();
    }
  })();
}
function renameFile(fileName) {
  let newInp = document.createElement('input');
  newInp.classList.add('newInp');
  newInp.placeholder = fileName;
  newInp.title = 'Hit enter to save! Click away to Abandon!';
  changeBgOpacity(0.1);
  body.appendChild(newInp);
  document.querySelector('.newInp').focus();
  setTimeout(() => {
    document.addEventListener(
      'click',
      () => {
        newInp.remove();
        return;
      },
      { once: true }
    );
  }, 500);
}
function properties(fileName) {
  let el = document.createElement('div');
  el.classList.add('propertiesBox');
  const mime = require('mime');
  fileName = fileName.includes("menus") ? "" : fileName;
  let mimeType = mime.getType(currentPath + '/' + fileName);
  let fsStats = fs.statSync(currentPath + '/' + fileName);
  let fileOrFolder = 'file';
  let testSize = 'N/A';
  if (isFile(fileName) == 'file') {
    fileOrFolder = true;
    testSize = fsStats.size;
  } else if (isFile(fileName) == 'locked-folder') {
    fileOrFolder = 'url(../assets/folders/lockedFolder.png)';
  } else {
    fileOrFolder = false;
    testSize = 0;
  }
  let imgURL =
    fileOrFolder == 'url(../assets/folders/lockedFolder.png)'
      ? '../assets/folders/lockedFolder.png'
      : initImage(fileName, fileOrFolder).replace('url(', '').replace(')', '');
  let isRlyFolder = mimeType == null && fsStats.size == 0 ? 'folder' : 'Unknown';
  let fpName = fileName ? fileName.length > 25 ? fileName.slice(0, 25) + '...' : fileName : currentPath.split("/").pop();
  const fileProps = {
    size: testSize | Math.floor(Math.random() * 1_000_000 + 100_000),
    createdAt: fsStats.birthtime.toLocaleString(),
    modifiedAt: fsStats.mtime.toLocaleString(),
    openedAt: fsStats.atime.toLocaleString(),
    location: currentPath,
    fileType: mimeType || isRlyFolder,
    name: fpName,
    img: imgURL,
  };
  function changeEl() {
    el.innerHTML = `
    <div class="smallHead">
    <img src="${fileProps.img}" width="20px"/>  <p> ${fileProps.name} - ${curLang.singles.properties}</p>
    </div>
    <div class="smallBody">
      <div class="row">
        <img src="${fileProps.img}" width="50px"/>
        <h3>${fileProps.name}</h3>
      </div>
      <div class="lineB"></div>
      <p>${curLang.singles.fileType} ${fileProps.fileType}</p>
      <div class="lineB"></div>
     <p>${curLang.singles.location} ${fileProps.location}</p>
     <p>${curLang.singles.size}: ${convertBytes(fileProps.size)}</p>
      <div class="lineB"></div>
     <p>${curLang.singles.createdAt} ${fileProps.createdAt}</p>
     <p>${curLang.singles.lChanges} ${fileProps.modifiedAt}</p>
     <p>${curLang.singles.lOpen} ${fileProps.openedAt}</p>
      <div class="lineB"></div>
    </div>
  `;
  }
  changeEl();
  el.placeholder = fileName;
  changeBgOpacity(0.1);
  body.appendChild(el);
  if (isRlyFolder == 'folder') {
    fs.writeFileSync(TEMP_FOLDER_FILE, "")
    setTimeout(() => {
      console.log([SPAWN_FILE, currentPath + '/' + fileName])
      const spawnedProc = spawn('node', [SPAWN_FILE, currentPath + '/' + fileName], { detached: false, stdio: ['ignore'] })
      spawnedProc.unref();
    }, 100)
    let idInt = setInterval(() => {
      let fileRead = fs.readFileSync(TEMP_FOLDER_FILE, "utf-8")
      if (fileRead) {
        fileProps.size = fileRead;
        changeEl();
        fs.writeFileSync(TEMP_FOLDER_FILE, "")
        return clearInterval(idInt);
      }
      changeEl();
      fileProps.size += Math.floor(Math.random() * 300_000_000 + 10_000_000);
    }, 500);
  }
  setTimeout(() => {
    document.addEventListener(
      'click',
      (e) => {
        changeBgOpacity('');
        el.remove();
      },
      { once: true }
    );
  }, 500);
}
function getHeight(element) {
  element.style.visibility = 'hidden';
  document.body.appendChild(element);
  var height = element.offsetHeight + 0;
  document.body.removeChild(element);
  element.style.visibility = 'visible';
  return height;
}
function getWidth(element) {
  element.style.visibility = 'hidden';
  document.body.appendChild(element);
  var width = element.offsetWidth + 0;
  document.body.removeChild(element);
  element.style.visibility = 'visible';
  return width;
}
function createFileWithCopy(fileName) {
  let adddedCopy = copiedFileName + '-copy';
  if (isFile(fileName) == 'file') {
    adddedCopy = copiedFileName.split('.');
    adddedCopy[adddedCopy.length - 2] += '-copy';
    adddedCopy = adddedCopy.join('.');
  }
  return adddedCopy;
}
function isFile(file) {
  try {
    let tPath = file.includes('/') ? file : currentPath + '/' + file.replace(SPACE_REGEX, ' ');
    return fs.lstatSync(tPath).isFile() ? 'file' : 'folder';
  } catch (e) {
    return 'locked-folder';
  }
}

function changeBgOpacity(num) {
  document.querySelector('.header').style.opacity = num;
  document.querySelector('.menus').style.opacity = num;
  document.querySelector('.draggable').style.opacity = num;
}
function deleteBg(num) {
  if (num == 'none') {
    document.querySelector('.draggable').style.opacity = 0.1;
  } else {
    document.querySelector('.draggable').style.opacity = num;
  }
  document.querySelector('.header').style.display = num;
  document.querySelector('.menus').style.display = num;
}
async function handleCommandsStorage() {
  const codeExists = await lookpath('code');
  if (codeExists != undefined) {
    localStorage.setItem('code', 1);
  } else {
    localStorage.setItem('code', 0);
  }
}

function openInCode(el) {
  if (el == 'menus') {
    exec('code ' + currentPath, (error, stdout, stderr) => {
      if (error || stderr) return handleErr(error);
    });
  } else {
    exec('code ' + currentPath + '/' + el, (error, stdout, stderr) => {
      if (error || stderr) return handleErr(error);
    });
  }
}

function createFile() {
  let newInp = document.createElement('input');
  newInp.classList.add('newInp');
  newInp.placeholder = 'File.txt';
  newInp.title = 'Hit enter to save!';
  changeBgOpacity(0.1);
  body.appendChild(newInp);
  document.querySelector('.newInp').focus();
  setTimeout(() => {
    document.addEventListener(
      'click',
      () => {
        newInp.remove();
        return;
      },
      { once: true }
    );
  }, 500);
}

let lastSelectedEl = [];
function handleSelectDiv(ev) {
  let elementClicked = ev.target.classList.value.includes('solo ') ? ev.target : ev.target.parentNode;

  if (!ev.ctrlKey) {
    if (lastSelectedEl[0]) {
      for (let i = 0; i < lastSelectedEl.length; ++i) {
        lastSelectedEl[i].classList.remove('selected');
      }
      lastSelectedEl = [];
    }
  }

  if (lastSelectedEl.indexOf(elementClicked) != -1) {
    lastSelectedEl[lastSelectedEl.indexOf(elementClicked)].classList.remove('selected');
    lastSelectedEl.splice(lastSelectedEl.indexOf(elementClicked), 1);
  } else {
    lastSelectedEl.push(elementClicked);
    elementClicked.classList.add('selected');
  }
}


function handleWaitAnim(goIn) {
  const soloDiv = document.querySelectorAll('.solo');
  if (goIn) {
    document.querySelector('.clock-loader').style.display = 'flex';
    document.querySelector('.menus').style.opacity = '.3';
    soloDiv.forEach((el) => (el.style.cursor = 'progress'));
  } else {
    document.querySelector('.clock-loader').style.display = 'none';
    document.querySelector('.menus').style.opacity = '';
    soloDiv.forEach((el) => (el.style.cursor = 'pointer'));
  }
}


function goBack() {
  if (currentPath.slice(-2) != ':/') {
    lastPath = currentPath;
    currentPath = currentPath.split('/');
    currentPath.pop();
    currentPath = currentPath.join('/');
    if (currentPath.slice(-1) == ':') currentPath = currentPath + '/';
    handleChangePath();
    handleSingleDrag();
  }
}
function handleClose() {
  const getWindow = () => remote.BrowserWindow.getFocusedWindow();
  const closeApp = document.getElementById('close');
  const minimizeApp = document.getElementById('minimize');
  const fullScreenApp = document.getElementById('fullScreen');
  closeApp.addEventListener('click', closeWindow);
  minimizeApp.addEventListener('click', minimizeWindow);
  fullScreenApp.addEventListener('click', maximizeWindow);
  function closeWindow() {
    getWindow().close();
  }

  function minimizeWindow() {
    getWindow().minimize();
  }

  function maximizeWindow() {
    const window = getWindow();
    window.isMaximized() ? window.unmaximize() : window.maximize();
  }
}

async function createSetting() {
  let el = document.createElement('div');
  el.classList.add('propertiesBox');
  el.style.boxShadow = '4px 6px 20px 0px black';
  let optString = `
  <option value="enabled">${curLang.singles.enabled}</option>
  <option value="disable">${curLang.singles.disabled}</option>
  `;
  if (!safe_mode) {
    optString = `
    <option value="disable">${curLang.singles.disabled}</option>
    <option value="enabled">${curLang.singles.enabled}</option>
    `;
  }
  el.innerHTML = `
   
    <div class="smallBody">
      <div class="row" style="margin:40px 0 20px">
        <h3>${curLang.singles.settings}</h3>
      </div>
      <div class="lineB"></div>
      <p>
      ${curLang.singles.language}  
        <select name="languages" id="languages">
          ${langsOpts}
        </select>
      </p>
        <div class="lineB"></div>
          <p>${curLang.singles.sPath} <input class="startInp" id="startPathInp" type="text" value="${start_path}"></input></p>
        <p>${curLang.singles.nori} <input class="rItemsInp" id="noriInp" type="number" value=${max_ls_length}  min=0 max=10></input></p>
      <div class="lineB"></div>
      <p>
      ${curLang.singles.safeMode}
        <select name="safeMode" id="safeMode">
          ${optString}
        </select>
      </p>
      <div class="lineB"></div>
     
    </div>
    <div class="smallHead sae" onclick="closeSettings('saved')">
      <p>${curLang.singles.sae}</p>  
    </div>
  `;
  deleteBg('none');
  body.appendChild(el);
}

function closeSettings(isSaved) {
  let edArr = [
    document.getElementById('safeMode').options[0].value,
    document.getElementById('safeMode').options[1].value,
  ];
  if (isSaved == 'saved') {
    let newJSON = {
      lang: langsArr[document.getElementById('languages').selectedIndex],
      max_ls_length: document.getElementById('noriInp').value,
      safe_mode: edArr[document.getElementById('safeMode').selectedIndex] == 'enabled' ? true : false,
      start_path: start_path,
    };
    let start = document.getElementById('startPathInp').value;
    if (start && start.includes(':')) {
      fs.access(start, fs.F_OK, (err) => {
        if (err) {
          handleErr(err);
          fs.writeFile('./setting.json', JSON.stringify(newJSON), function writeJSON(err) {
            if (err) return handleErr(err);
            max_ls_length = newJSON.max_ls_length;
            start_path = newJSON.start_path;
            lang = newJSON.lang;
            safe_mode = newJSON.safe_mode;
            handleLang();
            handleChangePath();
            initLeftHTMLBar();
            handleSingleDrag();
          });
          return;
        }
        newJSON.start_path = start;
        fs.writeFile('./setting.json', JSON.stringify(newJSON), function writeJSON(err) {
          if (err) return handleErr(err);
          max_ls_length = newJSON.max_ls_length;
          start_path = newJSON.start_path;
          lang = newJSON.lang;
          safe_mode = newJSON.safe_mode;
          handleLang();
          handleChangePath();
          initLeftHTMLBar();
          handleSingleDrag();
        });
      });
    }
  }

  deleteBg('');
  document.querySelector('.propertiesBox').remove();
}



document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

window.addEventListener('resize', () => {
  if (window.innerWidth >= 1669) {
    searchIcon.style.left = '-80px';
  } else {
    if (window.innerWidth >= 1137) {
      searchIcon.style.left = '-75px';
    } else {
      searchIcon.style.left = '';
      if (window.innerWidth >= 1037) {
        document.querySelector('.sortByDiv').style.display = '';
        searchIcon.style.left = '-60px';
      } else {
        document.querySelector('.sortByDiv').style.display = 'none';
        searchIcon.style.left = '';
        if (window.innerWidth >= 834) {
          document.querySelector('.curPathDiv').style.width = '';
          document.querySelector('.sortIcons').style.width = '';
          if (currentPath.length > 40) {
            currentPathDiv.innerHTML = currentPath.replace(/\//g, '\\').slice(0, 37) + '...';
          } else {
            currentPathDiv.innerHTML = currentPath.replace(/\//g, '\\');
          }
        } else {
          document.querySelector('.curPathDiv').style.width = '20%';
          document.querySelector('.sortIcons').style.width = '80px';
          if (currentPath.length > 10) {
            currentPathDiv.innerHTML = currentPath.replace(/\//g, '\\').slice(0, 7) + '...';
          } else {
            currentPathDiv.innerHTML = currentPath.replace(/\//g, '\\');
          }
          if (window.innerWidth >= 515) {
            document.querySelector('.sideMenu').style.display = '';
            foldersMenu.style.margin = '';
          } else {
            document.querySelector('.sideMenu').style.display = 'none';
            foldersMenu.style.margin = '80px 30px 0 30px';
            if (window.innerWidth >= 400) {
              document.querySelector('.curPathDiv').style.width = '20%';
            } else {
              document.querySelector('.curPathDiv').style.width = '10%';
            }
          }
        }
      }
    }
  }
});


window.addEventListener('DOMContentLoaded', () => {
  firstCall();
});
