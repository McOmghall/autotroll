const nomenclator = require('./model/clean')
const auxFunctions = require('./aux_functions')
const Twitter = require('twitter')
const request = require('request-promise-native')
const cheerio = require('cheerio')
const http = require('http')
const https = require('https')
const GoogleImages = require('google-images')
const stopwords = [].concat(require('stopwords-es')).concat(require('stopwords-pt')).concat(require('stopwords-gl')).concat(require('stopwords-en'))

const pseudoMarkovNetwork = auxFunctions.pseudoMarkovNetwork(nomenclator)
const trueMarkovNetwork = auxFunctions.trueMarkovNetwork(nomenclator)
const refraneiro = Promise.all(new Array(20).fill(1).map((e, i) => request.get({
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

var secretconfig
try {
  console.log('Trying to get secretconfig from local config')
  secretconfig = require('./secretconfig')
} catch (e) {
  console.log('Failed getting twitconfig from local config: Getting from env vars')
}

const twitterClient = new Twitter(secretconfig.twitconfig || {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

const googleImageSearchKeys = secretconfig.googleimagesconfig
const GoogleImageSearchClient = new GoogleImages(googleImageSearchKeys.SEARCH_ENGINE_ID || process.env.SEARCH_ENGINE_ID, googleImageSearchKeys.SEARCH_ENGINE_API_KEY || process.env.SEARCH_ENGINE_API_KEY)

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

const galizaStream = twitterClient.stream('statuses/filter', { track: 'galiza,galicia' })
const words = {}
var time = Date.now()
const wordExclusionList = ['galiza', 'galicia']
const ACTIVATION_WORD_COUNT = 10
galizaStream.on('data', (event) => {
  event.cleantext = ((e) => {
    var txt = Object.assign(e)
    txt = txt.replace(/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g, '') // Destroy emoji
    txt = txt.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') // Destroy urls
    const symbols = [/\n/g, /\t/g, /\./g, /,/g, /\?/g, /¿/g, /!/g, /¿/g, /:/g, /\|/g, /\(/g, /\)/g, /-/g, /€/g, /"/g, /'/g, /`/g]
    symbols.forEach((symbol) => {
      txt = txt.replace(symbol, ' ') // Destroy puctuation (note spaces)
    })
    txt = txt.replace('RT ', '') // Destroy RT signals
    txt = txt.replace(/#\w*/g, '') // Destroy hastags
    txt = txt.replace(/@(\w){0,15}/g, '') // Destroy twitter handles
    txt = txt.replace(/\u2026/g, '') // Destroy ellipses
    txt = txt.replace(/[0-9]/g, '') // Destroy numbers
    txt = txt.split(' ').filter((e) => e !== ' ' && e !== '' && stopwords.indexOf(e.toLowerCase()) < 0).join(' ') // Destroy stopwords for relevant languages

    return txt.toLowerCase()
  })(event.text)

  for (let i in event.cleantext.split(' ')) {
    let w = event.cleantext.split(' ')[i]
    words[w] = (words[w] || 0) + 1

    if (words[w] > ACTIVATION_WORD_COUNT && !wordExclusionList.includes(w)) {
      console.log('Time to get a term: %s mins', (Date.now() - time) / (1000 * 60)) // To minutes
      time = Date.now()
      console.log('GALIZA is THINKING ABOUT %s', w)
      Object.keys(words).forEach((k) => { delete words[k] })
      break
    }
  }

  console.log('Top 5 terms: %j', Object.keys(words).sort((a, b) => words[b] - words[a]).slice(0, 5).map((e) => ({ [e]: words[e] })))
})

http.createServer(function (request, response) {
  console.log('Ping')
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.write(JSON.stringify(Object.keys(words).sort((a, b) => words[b] - words[a]).map((e) => ({ [e]: words[e] })), null, 2) + '\n\n')

  response.end()
}).listen(process.env.PORT || 8080)

console.log('Ready to rumble')

const cycleInMillisecondsForKeepalive = 10 * 60 * 1000 // Keep alive every 10 mins
const cycleInMillisecondsForNormalPosting = 15 * 60 * 1000 // Post every 15 mins
const firstCycleInMilliseconds = Math.ceil(Date.now().valueOf() / cycleInMillisecondsForNormalPosting) * cycleInMillisecondsForNormalPosting - Date.now().valueOf() // Execute the first cycle the next multiple of 15 mins (as per cycleInMillisecondsForNormalPosting) in an hour (xx:00, xx:15, xx:30, xx:45)

console.log('Waiting for %s minutes before 1st posting', firstCycleInMilliseconds / (60 * 1000))

setInterval(() => (process.env.APP_URL.includes('https') ? https : http).get(process.env.APP_URL), cycleInMillisecondsForNormalPosting) 
setTimeout(() => {
  repeat()
  setInterval(repeat, cycleInMillisecondsForNormalPosting)
}, firstCycleInMilliseconds)
