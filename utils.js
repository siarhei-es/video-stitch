const { fileFormats } = require('./constants')

const createResponce = (res, error) => error ? res.status(500).send({ error: error.message }) : res.send()

// Need to remove .ts file, downloading .m3u8 file creates .ts file
const getPreparedDeleteFilePaths = ({ paths }) => {
  const res = []

  paths.forEach((path) => {
    res.push(path)
    res.push(path.replace(fileFormats.m3u8, fileFormats.ts))
  })

  return res
}

module.exports = { createResponce, getPreparedDeleteFilePaths }