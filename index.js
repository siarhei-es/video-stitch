const express = require('express')
// const { body, validationResult } = require('express-validator')

const cors = require('cors')
const bodyParser = require('body-parser')

const { cutVideo, downloadVideo, deleteFilesAsync, mergeVideos, uploadVideo } = require('./ffmpeg')
const { createResponce } = require('./utils')

const app = express()

app.use(bodyParser.json())
app.use(cors({ origin: '*', credentials: true }))

app.post('/cut', (req, res) => {
  const { body: { playbackId, duration, uploadUrl } } = req

  cutVideo({ playbackId, duration, uploadUrl }).then(
    () => createResponce(res),
    (error) => createResponce(res, error)
  )
})

app.post('/merge', (req, res) => {
  const { body: { links, uploadUrl } } = req

  const promises = links.map((link) => downloadVideo({ link }))

  Promise.allSettled(promises).then((results) => {
    const errors = []
    const outputPaths = []

    results.forEach((result) => {
      if (result.status === 'rejected') {
        errors.push(result.reason.error.message)
        outputPaths.push(result.reason.outputPath)
      } else if (result.status === 'fulfilled') outputPaths.push(result.value.outputPath)
    })

    if (errors.length) {
      deleteFilesAsync(outputPaths).then(() => createResponce(res, { message: errors.join(' ') }))
    } else {
      mergeVideos({ inputPaths: outputPaths }).then(
        ({ outputPath }) => {
          const deletePaths = [...outputPaths, outputPath]

          uploadVideo({ outputPath, uploadUrl }).then(
            () => deleteFilesAsync(deletePaths).then(() => createResponce(res)),
            (error) => deleteFilesAsync(deletePaths).then(() => createResponce(res, error))
          )
        },
        ({ error, outputPath }) => {
          deleteFilesAsync([...outputPaths, outputPath]).then(() => createResponce(res, error))
        },
      )
    }
  })
});

// Move to env file if needed
const port = 3000

app.listen(port, () => console.log(`listening on port ${port}`))