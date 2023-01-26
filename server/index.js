const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser')

require("dotenv").config()

const fs = require('@cyclic.sh/s3fs')(process.env.CYCLIC_BUCKET_NAME)

const SERVER_INFO_PATH = process.env.SERVER_INFO_PATH
const SERVER_INFO_LINK = process.env.SERVER_INFO_LINK
const SERVER_DOWNLOAD_PATH = process.env.SERVER_DOWNLOAD_PATH
const SERVER_DOWNLOAD_LINK = process.env.SERVER_DOWNLOAD_LINK
const SERVER_ADD_DOWNLOAD_INFO = process.env.SERVER_ADD_DOWNLOAD_INFO
const SERVER_READ_DOWNLOAD_INFO = process.env.SERVER_READ_DOWNLOAD_INFO
const SERVER_UPLOAD_PATH = process.env.SERVER_UPLOAD_PATH
// const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER
const DB_FILE = process.env.DB_FILE
const PORT = process.env.PORT

const MAX_SHARE_SIZE = 21_000_000


const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.post(SERVER_UPLOAD_PATH, async (req, res) => {

  let fileContent = new Buffer(req.body.fileContent)
  let fileName = req.body.fileName
  let maxDownloads = req.body.maxDownloads
  let hash = generateHash()
  console.log(hash)
  fs.writeFileSync(hash, fileContent)

  let fileObject = readDB()

  fileObject[hash] = {
    name: fileName,
    size: fileContent.toString().length,
    downloads: 0,
    maxDownloads
  }

  writeDB(fileObject)
  // Response successfully 
  // Returned hash to display copiable link
  res.send({
    status: true,
    message: 'File is uploaded',
    hash
  });
});


app.post(SERVER_DOWNLOAD_PATH, async (req, res) => {
  console.log(req.body.hash)
  let fileHash = req.body.hash
  let fileContent = fs.readFileSync(fileHash)


  let fileDB = readDB()
  let fileName = fileDB[fileHash].name

  fileDB[fileHash].downloads++
  if (fileDB[fileHash].downloads >= fileDB[fileHash].maxDownloads) {
    removeFile(fileHash)
    delete fileDB[fileHash]
  }
  writeDB(fileDB)
  res.send({
    status: true,
    message: "File found",
    fileName,
    fileContent
  })
})

app.get(SERVER_ADD_DOWNLOAD_INFO, async (req, res) => {
  let fileDB = readDB()
  if (!fileDB.ORCHIDEI)
    fileDB.ORCHIDEI = 0
  fileDB.ORCHIDEI++
  writeDB(fileDB)
  res.send({
    dowloads: fileDB.ORCHIDEI
  })
})

app.get(SERVER_READ_DOWNLOAD_INFO, async (req, res) => {
  let fileDB = readDB()
  if (!fileDB.ORCHIDEI)
    fileDB.ORCHIDEI = 0
  res.send({
    dowloads: fileDB.ORCHIDEI
  })
})

app.get("/db-test/", (req, res) => {
  let fileDB = readDB()
  res.send(fileDB)
})

app.get("/folder-test/", (req, res) => {
  res.send(fs.readdirSync("."))
})


app.listen(PORT, () => {
  try {
    console.log("Created file because didnt exists")
    fs.writeFileSync(DB_FILE, "{}", { flag: 'wx' });
  } catch (er) {
    console.log("File exists: " + er)
  }
  console.log(`App is listening on port ${PORT}.`)
});


function generateHash() {
  let time = new Date().getTime()
  let id = time + ""
  const SYMBOLS = "abcdefghijklmnopqrstuwvxyz"
  let hash = ""
  for (let i in id) {
    hash += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] + id[i]
  }
  return hash
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"))
}
function writeDB(_content) {
  return fs.writeFileSync(DB_FILE, JSON.stringify(_content))
}

function removeFile(_path) {
  fs.unlinkSync(_path)
}