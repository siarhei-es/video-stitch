const fs = require('fs');
const path = require('path')

const express = require('express')
// const { body, validationResult } = require('express-validator')

const cors = require('cors')
const bodyParser = require('body-parser')

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')

const { v1: uuidv1 } = require('uuid')
const request = require('request')

const { createResponce } = require('./utils')

const app = express()

app.use(bodyParser.json())
app.use(cors({ origin: '*', credentials: true }))

ffmpeg.setFfmpegPath(ffmpegPath)

// Move to env file if needed
const muxDomain = 'https://stream.mux.com'
const m3u8Format = 'm3u8'
const mp4Format = 'mp4'

app.post('/cut', (req, res) => {
  const { body: { playbackId, duration, uploadUrl } } = req

  const outputPath = path.join(__dirname, `${uuidv1()}.${mp4Format}`)

  ffmpeg()
    .input(`${muxDomain}/${playbackId}.${m3u8Format}`)
    .inputOptions([`-t ${duration}`])
    .output(outputPath)
    .on('end', () =>
      fs.createReadStream(outputPath)
        .pipe(request.put(uploadUrl))
        .on('end', () => fs.unlink(outputPath, () => createResponce(res)))
        .on('error', (error) => fs.unlink(outputPath, () => createResponce(res, error))))
    .on('error', (error) => fs.unlink(outputPath, () => createResponce(res, error)))
    .run()
})

// Move to env file if needed
const port = 3000

app.listen(port, () => console.log(`listening on port ${port}`))
