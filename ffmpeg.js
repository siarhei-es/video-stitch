const fs = require('fs')
const path = require('path')
const util = require('util');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')
const ffprobe = require('ffprobe-static')

const request = require('request')

const { v1: uuidv1 } = require('uuid')

const { fileFormats } = require('./constants')

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobe.path)

// Move to env file if needed
const muxDomain = 'https://stream.mux.com'

const deleteFileAsync = util.promisify(fs.unlink)

const deleteFilesAsync = async (paths) => {
  const promises = paths.map((path) => deleteFileAsync(path))

  return Promise.allSettled(promises)
}

const uploadVideo = ({ outputPath, uploadUrl }) => new Promise((res, rej) => {
  fs.createReadStream(outputPath)
    .pipe(request.put(uploadUrl))
    .on('end', () => res())
    .on('error', (error) => rej(error))
})

const cutVideo = async ({ playbackId, duration, uploadUrl }) => new Promise((res, rej) => {
  const outputPath = path.join(__dirname, `${uuidv1()}${fileFormats.mp4}`)

  ffmpeg()
    .input(`${muxDomain}/${playbackId}${fileFormats.m3u8}`)
    .inputOptions([`-t ${duration}`])
    .output(outputPath)
    .on('end', () =>
      fs.createReadStream(outputPath)
        .pipe(request.put(uploadUrl))
        .on('end', () => fs.unlink(outputPath, () => res()))
        .on('error', (error) => fs.unlink(outputPath, () => rej(error)))
    )
    .on('error', (error) => rej({ error }))
    .run()
});

const mergeVideos = async ({ inputPaths }) => new Promise((res, rej) => {
  const outputPath = path.join(__dirname, `${uuidv1()}${fileFormats.mp4}`)

  let ffmpegIns = ffmpeg()

  inputPaths.forEach((inputPath) => ffmpegIns = ffmpegIns.input(inputPath))

  ffmpegIns
    .on('end', () => res({ outputPath }))
    .on('error', (error) => rej({ error, outputPath }))
    .mergeToFile(outputPath, __dirname);
})

const downloadVideo = async ({ link }) => new Promise((res, rej) => {
  const outputPath = path.join(__dirname, `${uuidv1()}${fileFormats.mp4}`)

  ffmpeg()
    .input(link)
    .output(outputPath)
    .on('end', () => res({ outputPath }))
    .on('error', (error) => rej({ error, outputPath }))
    .run()
})

module.exports = {
  cutVideo,
  mergeVideos,
  downloadVideo,
  uploadVideo,
  deleteFilesAsync,
}
