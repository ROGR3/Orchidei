const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const fs = require("fs")

require("dotenv").config()
const SERVER_INFO_PATH = process.env.SERVER_INFO_PATH
const SERVER_INFO_LINK = process.env.SERVER_INFO_LINK
const SERVER_DOWNLOAD_PATH = process.env.SERVER_DOWNLOAD_PATH
const SERVER_DOWNLOAD_LINK = process.env.SERVER_DOWNLOAD_LINK
const SERVER_UPLOAD_PATH = process.env.SERVER_UPLOAD_PATH
const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER
const DB_FILE = process.env.DB_FILE
const PORT = process.env.PORT

const ABSOLUTE_UPLOAD_FOLDER = __dirname + "/" + UPLOAD_FOLDER

const app = express();


app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!")
})

app.post(SERVER_UPLOAD_PATH, fileUpload({ createParentPath: true }), async (req, res) => {
  try {
    if (!req.files) {
      console.log("failed")
      console.log("No files recieved")
      res.send({
        status: false,
        message: 'No file uploaded',
        hash: "File upload failed"
      });
    } else {
      let maxDownloads = req.body.maxDownloads
      let uploadedFiles = req.files;
      let uploadedFile = uploadedFiles[Object.keys(uploadedFiles)[0]]

      let hashedFile = generateHash(uploadedFile)
      let fileObject = readDB(DB_FILE)

      // Initialize object structure
      fileObject[hashedFile] = {
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.mimetype,
        downloads: 0,
        maxDownloads
      }

      // Dowload uploaded file using mv function, coming from 'express-fileupload'
      uploadedFile.mv(ABSOLUTE_UPLOAD_FOLDER + hashedFile, (err) => {
        if (err)
          console.log("error: " + err)
      });

      writeDB(DB_FILE, fileObject)

      // Response successfully 
      // Returned hash to display copiable link
      res.send({
        status: true,
        message: 'File is uploaded',
        hash: hashedFile
      });
    }
  } catch (err) {
    console.log("Unable to upload. Error: " + err)
    res.status(500).send(err);
  }
});

app.get(SERVER_DOWNLOAD_LINK, async (req, res) => {
  try {
    // Get File hash from URL
    let fileHash = req.url.replace(SERVER_DOWNLOAD_PATH, "")
    let fileObject = readDB(DB_FILE)

    res.download(ABSOLUTE_UPLOAD_FOLDER + fileHash, (err) => {
      if (err)
        console.log("Failed to download. Error: " + err)
      else {
        removeFile(ABSOLUTE_UPLOAD_FOLDER + fileHash)
        delete fileObject[fileHash]
      }
    })

  }
  catch (err) {
    console.log("Catched error while downloading. Error: " + err)
  }
})

app.get(SERVER_INFO_LINK, async (req, res) => {
  try {
    // Get File hash from URL
    let fileHash = req.url.replace(SERVER_INFO_PATH, "")
    let fileDB = readDB(DB_FILE)

    // Increase the download number in coresponding file
    fileDB[fileHash].downloads++

    writeDB(DB_FILE, fileDB)

    // Response successfully 
    res.send({
      status: true,
      message: "File found",
      file: fileDB[fileHash]
    })
  }
  catch (err) {
    console.log("Catched error while getting file info. Error: " + err)
  }
})

app.listen(PORT, () => {
  if (!fs.existsSync(UPLOAD_FOLDER)) {
    // fs.mkdirSync(UPLOAD_FOLDER);
    // fs.writeFileSync(DB_FILE, "{}");
    console.log(UPLOAD_FOLDER + " did not not exist. Created together with file " + DB_FILE)
  }
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