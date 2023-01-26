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
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))

app.post(SERVER_UPLOAD_PATH, async (req, res) => {
  console.log("req.body: " + req.body)
  console.log("req.body.fileContent: " + req.body.fileContent)
  console.log("req.body.fileName: " + req.body.fileName)
  // try {
  //   if (!req.files) {
  //     console.log("failed")
  //     console.log("No files recieved")
  //     res.send({
  //       status: false,
  //       message: 'No file uploaded',
  //       hash: "File upload failed"
  //     });
  //   } else {
  //     let maxDownloads = req.body.maxDownloads
  //     let uploadedFiles = req.files;
  //     let uploadedFile = uploadedFiles[Object.keys(uploadedFiles)[0]]
  //     if (uploadedFile.size >= MAX_SHARE_SIZE)
  //       return

  //     let hashedFile = generateHash(uploadedFile)
  //     let fileObject = readDB(DB_FILE)

  //     // Initialize object structure
  //     fileObject[hashedFile] = {
  //       name: uploadedFile.name,
  //       size: uploadedFile.size,
  //       type: uploadedFile.mimetype,
  //       downloads: 0,
  //       maxDownloads
  //     }
  //     console.log(uploadedFile)
  //     // Dowload uploaded file using mv function, coming from 'express-fileupload'
  //     uploadedFile.mv(hashedFile, (err) => {
  //       if (err)
  //         console.log("error: " + err)
  //     });

  //     writeDB(DB_FILE, fileObject)

  //     // Response successfully 
  //     // Returned hash to display copiable link
  //     res.send({
  //       status: true,
  //       message: 'File is uploaded',
  //       hash: hashedFile
  //     });
  //   }
  // } catch (err) {
  //   console.log("Unable to upload. Error: " + err)
  //   res.status(500).send(err);
  // }
});


app.get(SERVER_INFO_LINK, async (req, res) => {
  try {
    // Get File hash from URL
    let fileHash = req.url.replace(SERVER_INFO_PATH, "")
    let fileDB = readDB(DB_FILE)
    console.log(fileDB[fileHash])

    // Increase the download number in coresponding file
    fileDB[fileHash].downloads++
    console.log(fs.readdirSync("."))
    const fileContent = fs.readFileSync(fileHash, "utf-8")
    console.log(fileContent)

    writeDB(DB_FILE, fileDB)

    // Response successfully 
    res.send({
      status: true,
      message: "File found",
      file: fileDB[fileHash],
      fileContent
    })
  }
  catch (err) {
    console.log("Catched error while getting file info. Error: " + err)
  }
})

app.get(SERVER_ADD_DOWNLOAD_INFO, async (req, res) => {
  let fileDB = readDB(DB_FILE)
  if (!fileDB.ORCHIDEI)
    fileDB.ORCHIDEI = 0
  fileDB.ORCHIDEI++
  writeDB(DB_FILE, fileDB)
  res.send({
    dowloads: fileDB.ORCHIDEI
  })
})

app.get(SERVER_READ_DOWNLOAD_INFO, async (req, res) => {
  let fileDB = readDB(DB_FILE)
  if (!fileDB.ORCHIDEI)
    fileDB.ORCHIDEI = 0
  res.send({
    dowloads: fileDB.ORCHIDEI
  })
})

app.get("/db-test/", (req, res) => {
  let fileDB = readDB(DB_FILE)
  res.send(fileDB)
})

app.get("/folder-test/", (req, res) => {
  res.send(fs.readdirSync("."))
})


app.listen(PORT, () => {
  // try {
  //   console.log("Created file because didnt exists")
  //   fs.writeFileSync(DB_FILE, "{}", { flag: 'wx' });
  // } catch (er) {
  //   console.log("File exists: " + er)
  // }
  console.log(`App is listening on port ${PORT}.`)
});


function generateHash(file) {
  let time = new Date().getTime()
  let id = time + "" + file.size
  const SYMBOLS = "abcdefghijklmnopqrstuwvxyz"
  let hash = ""
  for (let i in id) {
    hash += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] + id[i]
  }
  return hash
}

function readDB(_path) {
  return JSON.parse(fs.readFileSync(_path, "utf-8"))
}
function writeDB(_path, _content) {
  return fs.writeFileSync(_path, JSON.stringify(_content))
}

function removeFile(_path) {
  fs.unlinkSync(_path)
}