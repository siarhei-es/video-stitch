const createResponce = (res, error) => error ? res.status(500).send({ error: error.message }) : res.send()

module.exports = { createResponce }