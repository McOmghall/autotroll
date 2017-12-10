const nomenclator = require('./model/clean')
const auxFunctions = require('./aux_functions')
const Twitter = require('twitter')
const request = require('request-promise-native')
const cheerio = require('cheerio')
const http = require('http')

const pseudoMarkovNetwork = auxFunctions.pseudoMarkovNetwork(nomenclator)
const trueMarkovNetwork = auxFunctions.trueMarkovNetwork(nomenclator)
const refraneiro = Promise.all(new Array(100).fill(1).map((e, i) => request.get({
  url: `http://refraneirogalego.com/page/${i + 1}/`,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36' // Yes, I am `actually' Chrome running on Windows! (to bypass throttling)
  }
}).then((body) => {
  const result = cheerio.load(body)('article h1 a').toArray().map((e) => e.children[0]).filter((e) => e.type === 'text').map((e) => e.data)
  return result
}).catch((error) => {
  console.error('Error: %s -> %s', error.options.url, error.statusCode || '(Not Sure Of The Code)')
  return []
}))).then((results) => {
  return results.reduce((a, e) => a.concat(e), [])
})

const twitterClient = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

const repeat = () => refraneiro.then((result) => {
  result.makeString = function () {
    return this[Math.floor((Math.random() * this.length))]
  }
  const phrase = (gen1, gen2, gen3) => `No lugar de ${gen1.makeString()}, parroquia de ${gen2.makeString()}, andan a dicir: "${gen3.makeString()}" #galiza #refraneiro`
  const next = phrase(pseudoMarkovNetwork, trueMarkovNetwork, result)
  return next
}).then((result) => {
  console.log('Posting %s', result)
  return twitterClient.post('statuses/update', { status: result })
}).then((success) => {
  const urlResult = `https://twitter.com/${success.user.screen_name}/status/${success.id}`
  console.log('Success: %s', urlResult)
}).catch((error) => {
  console.error('Error: %j', error)
})

http.createServer(function (request, response) {
  response.writeHead(200)
}).listen(process.env.PORT || 8080)

console.log('Ready to rumble')

setInterval(() => http.get(process.env.APP_URL), 10 * 60 * 1000) // Keep alive, every 10 mins
setInterval(repeat, 15 * 60 * 1000) // Every 15 mins
