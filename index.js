const Twitter = require('twitter')
const http = require('http')
const querystring = require('querystring')
const request = require('request-promise-native')
const GoogleImages = require('google-images')
const auxFunctions = require('./aux_functions')
var words = {
  wordList: {},
  queries: 0,
  amountOfResults: 0
}

/// /////////////////////////////////////////////
// GET SECURITY KEYS ON LOCAL DEV MACHINES
/// /////////////////////////////////////////////
var secretconfig = {}
try {
  console.log('Trying to get secretconfig from local config')
  secretconfig = require('./secretconfig')
} catch (e) {
  console.log('Failed getting secretconfig from local config: should get from env vars')
}

/// /////////////////////////////////////////////
// CONFIGURE GOOGLE IMAGE SEARCH CLIENT
/// /////////////////////////////////////////////
const imagesConfig = secretconfig.googleimagesconfig || {}
const SEARCH_ENGINE_ID = imagesConfig.SEARCH_ENGINE_ID || process.env.SEARCH_ENGINE_ID
const SEARCH_ENGINE_API_KEY = imagesConfig.SEARCH_ENGINE_API_KEY || process.env.SEARCH_ENGINE_API_KEY
const googleImageSearchClient = new GoogleImages(SEARCH_ENGINE_ID, SEARCH_ENGINE_API_KEY)

/// /////////////////////////////////////////////
// CONFIGURE TWITTER CLIENT
/// /////////////////////////////////////////////
const twitterClient = new Twitter(secretconfig.twitconfig || {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})
twitterClient.saySomething = async function generateRandomRefrain () {
  const phrase = `No lugar de ${auxFunctions.pseudoMarkovNetwork.makeString()}, parroquia de ${auxFunctions.trueMarkovNetwork.makeString()}, andan a dicir: "${(await auxFunctions.refraneiro).makeString()}" #galiza #galicia #refraneiro`
  console.log('Posting on twitter: %s', phrase)

  try {
    const result = await this.post('statuses/update', { status: phrase })
    const urlResult = `https://twitter.com/${result.user.screen_name}/status/${result.id}`
    console.log('PostingSuccess: %s', urlResult)
  } catch (error) {
    console.error('Error: %j', error)
  }
}
const twitterSearchTerms = ['galiza', 'galicia', 'galego']
const wordExclusionList = twitterSearchTerms.concat(['palabras', 'hilo', 'gallego'])
const MAXIMUM_TWITTER_SEARCH_QUERIES = 10
twitterClient.getWhatGalizaIsThinkingAbout = async function getWhatGalizaIsThinkingAbout () {
  const searchApi = this.get.bind(twitterClient, 'search/tweets')
  const basicSearchParams = { result_type: 'recent', tweet_mode: 'extended', count: 100 }
  const synthesis = {
    wordList: {},
    queries: 0,
    amountOfResults: 0
  }
  const q = twitterSearchTerms.join(' OR ')
  console.log('Querying twitter about %s', q)
  var currentQuery = searchApi.bind(this, Object.assign({}, { q: q }, basicSearchParams))
  do {
    let result = await currentQuery()
    synthesis.queries = synthesis.queries + 1
    synthesis.amountOfResults = synthesis.amountOfResults + result.statuses.length
    synthesis.wordList = result.statuses
      .map((e) => e.full_text)
      .map((e) => auxFunctions.cleanTweetText(e))
      .reduce((a, e) => a.concat(e.split(' ')), [])
      .reduce((a, e) => {
        a[e] = (a[e] || 0) + 1
        return a
      }, synthesis.wordList)
    console.log('Queried twitter (remaining %s times), got %s results', MAXIMUM_TWITTER_SEARCH_QUERIES - synthesis.queries, synthesis.amountOfResults)

    if (!(result.search_metadata && result.search_metadata.next_results)) {
      break
    } else {
      console.log('Continuating query (remaining %s times) with %s', MAXIMUM_TWITTER_SEARCH_QUERIES - synthesis.queries, result.search_metadata.next_results)
      const nextParams = querystring.parse(result.search_metadata.next_results.replace('?', ''))
      currentQuery = searchApi.bind(this, Object.assign({}, nextParams, basicSearchParams))
    }
  } while (synthesis.queries < MAXIMUM_TWITTER_SEARCH_QUERIES)

  return synthesis
}
twitterClient.postImageAboutGalizasThoughts = async function postImageAboutGalizasThoughts () {
  try {
    const thoughts = await this.getWhatGalizaIsThinkingAbout()
    words = thoughts // Too deep for me
    const terms = Object.keys(thoughts.wordList)
    const top5 = terms
      .filter((e) => !wordExclusionList.includes(e))
      .map((e) => ({ [e]: thoughts.wordList[e] }))
      .sort((a, b) => b[Object.keys(b)[0]] - a[Object.keys(a)[0]])
      .slice(0, 5)
    const top5terms = top5.map((e) => Object.keys(e)[0])
    const searchTerms = top5terms[Math.floor((Math.random() * top5terms.length))]

    console.log('From %s queries with %s tweets => Searching for %s => Top 5/%s terms: %j', thoughts.queries, thoughts.amountOfResults, searchTerms, terms.length, top5terms)
    const images = await googleImageSearchClient.search(searchTerms)
    const randomImageURL = images[Math.floor((Math.random() * images.length))].url

    console.log('Found %s images, getting random %s', images.length, randomImageURL)
    const image = Buffer.from(await request.get({ url: randomImageURL, encoding: null }), 'binary').toString('base64')
    console.log('Got image of %s base64 characters', image.length)

    const uploadResults = await this.post('media/upload', { media_data: image })
    const phrase = `Looks like Galiza is thinking about "${searchTerms}"... #galiza #galicia`
    const result = await this.post('statuses/update', { status: phrase, media_ids: uploadResults.media_id_string })

    const urlResult = `https://twitter.com/${result.user.screen_name}/status/${result.id}`
    console.log('Posting Success: %s', urlResult)

    return top5
  } catch (e) {
    console.log('Something errored %s %j', e, e)
    console.trace()
    return null
  }
}

/// /////////////////////////////////////////////
// ACTIVATE BOT PROCESSES
/// /////////////////////////////////////////////

const cycleInMillisecondsForKeepalive = 5 * 60 * 1000 // Keep alive every 5 mins
const cycleInMillisecondsForNormalPosting = 15 * 60 * 1000 // Post every 15 mins
const cycleInMillisecondsForGalizaIsThinking = 3 * 60 * 60 * 1000 // Post every 3 hours

setInterval(() => request.get(process.env.APP_URL), cycleInMillisecondsForKeepalive)
auxFunctions.cycleAccordingToMinutesInClock(twitterClient.saySomething, cycleInMillisecondsForNormalPosting)
auxFunctions.cycleAccordingToMinutesInClock(twitterClient.getWhatGalizaIsThinkingAbout, cycleInMillisecondsForGalizaIsThinking)

/// /////////////////////////////////////////////
// CREATE A SERVER KEEPING THE PROCCESS ALIVE TO MAKE HEROKU HAPPY
/// /////////////////////////////////////////////

http.createServer(function (request, response) {
  console.log('Ping')
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  words.wordList = Object.keys(words.wordList).sort((a, b) => words.wordList[b] - words.wordList[a]).reduce((a, e) => Object.assign(a, { [e]: words.wordList[e] }), {})
  response.write(JSON.stringify(words, null, 2) + '\n\n')

  response.end()
}).listen(process.env.PORT || 8080)

console.log('Ready to rumble')
