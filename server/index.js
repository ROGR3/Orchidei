const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/upload-file', fileUpload({ createParentPath: true }), async (req, res) => {
  console.log("here")
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
      console.log(uploadedFile)
      // //Use the mv() method to place the file in the upload directory (i.e. "uploads")
      uploadedFile.mv(__dirname + '/uploads/' + uploadedFile.name, (err) => {
        console.log("error: " + err)
      });

      // //send response
      res.send({
        status: true,
        message: 'File is uploaded',
        data: {
          name: uploadedFile.name,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size
        }
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
      console.log(err)
    })
  }
  catch (err) {
    console.log("Catched: " + err)
  }
})

app.listen(PORT, () =>
  console.log(`App is listening on port ${PORT}.`)
);