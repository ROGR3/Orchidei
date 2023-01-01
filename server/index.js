const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const fs = require("fs")

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/upload-file', fileUpload({ createParentPath: true }), async (req, res) => {
  console.log("here")
  console.log(req.files)
  try {
    if (!req.files) {
      console.log("failed")
      res.send({
        status: false,
        message: 'No file uploaded'
      });
    } else {
      let uploadedFiles = req.files;
      let uploadedFile = uploadedFiles[Object.keys(uploadedFiles)[0]]
      let hashedFile = generateHash(uploadedFile)
      let fileObject = readDB("./uploads/db.json")
      fileObject[hashedFile] = {
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.mimetype
      }
      console.log(fileObject)

      uploadedFile.mv(__dirname + '/uploads/' + hashedFile, (err) => {
        if (err)
          console.log("error: " + err)
      });

      writeDB("./uploads/db.json", fileObject)

      res.send({
        status: true,
        message: 'File is uploaded',
      });
    }
  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
});

app.get("/download/*", async (req, res) => {
  try {
    let fileName = req.url.replace("/download/", "")
    console.log(fileName)
    res.download(__dirname + "/uploads/" + fileName, (err) => {
      if (err)
        console.log("error: " + err)
    })
  }
  catch (err) {
    console.log("Catched: " + err)
  }
})

app.listen(PORT, () =>
  console.log(`App is listening on port ${PORT}.`)
);


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
function writeDB(_path, content) {
  return fs.writeFileSync(_path, JSON.stringify(content))
}