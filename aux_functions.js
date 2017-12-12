const fs = require('fs')
const request = require('request-promise-native')
const cheerio = require('cheerio')
const nomenclator = require('./model/clean')
const emojiRegex = require('emoji-regex/text.js')()
const stopwords = [].concat(require('stopwords-es')).concat(require('stopwords-pt')).concat(require('stopwords-gl')).concat(require('stopwords-en'))

/// //////////////////////////////////////
// SYNTACTIC SUGARY FUNCTIONS
/// //////////////////////////////////////

// Execute the first cycle the next multiple of given period in an hour
// i.e. for a period of 15 mins it will execute every hour and the following minutes: xx:00, xx:15, xx:30, xx:45
module.exports.cycleAccordingToMinutesInClock = (repeat, periodInMilliseconds) => {
  const firstCycleInMilliseconds = Math.ceil(Date.now().valueOf() / periodInMilliseconds) * periodInMilliseconds - Date.now().valueOf()
  const hours = Math.floor(firstCycleInMilliseconds / (1000 * 60 * 60))
  const mins = Math.floor((firstCycleInMilliseconds - hours * (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((firstCycleInMilliseconds - hours * (1000 * 60 * 60) - mins * (1000 * 60)) / 1000)
  console.log('Waiting for %s:%s:%s before 1st %s', (hours < 10 ? '0' : '') + hours, (mins < 10 ? '0' : '') + mins, (secs < 10 ? '0' : '') + secs, repeat.name)

  return setTimeout(() => {
    repeat()
    setInterval(repeat, periodInMilliseconds)
  }, firstCycleInMilliseconds)
}

/// //////////////////////////////////////
// FUNCTIONS TO CLEAN DATA FROM VARIOUS SOURCES
/// //////////////////////////////////////

module.exports.cleanDataFromNomenclators = function cleanDataFromNomenclators (data) {
  const clean = data.map((e) => {
    if (e[''] != null) {
      delete e['']
    }

    const rval = {}
    Object.keys(e).forEach((k) => {
      rval[k.toLowerCase()] = e[k]
    })

    const oragoRegexp = /\(([^)]+)\)/
    const matchesForOragoGalego = oragoRegexp.exec(rval.parroquia)
    if (matchesForOragoGalego != null) {
      rval.orago = matchesForOragoGalego[1]
      rval.parroquia = rval.parroquia.replace(oragoRegexp, '').trim()
    }

    const uniformizeNaming = (key) => {
      rval[key] = rval[key].toLowerCase().split(' ').map((w) => {
        if (w === 'de') {
          return w
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      }).join(' ')

      const artigoSplitter = rval[key].split(', ')
      rval[key] = artigoSplitter[0].trim()

      if (artigoSplitter[1] != null) {
        rval['artigo' + key] = artigoSplitter[1]
      }
    }
    ['provincia', 'concello', 'parroquia', 'lugar'].forEach((e) => uniformizeNaming(e))

    return rval
  })

  fs.writeFile('./model/clean.json', JSON.stringify(clean), 'utf8', (err, data) => {
    console.log('Written file %j %j', err, data)
  })
}

module.exports.cleanTweetText = function cleanTweetText (text) {
  var txt = text.toLowerCase()
  txt = txt.replace(emojiRegex, '') // Destroy emoji
  txt = txt.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') // Destroy urls
  const symbols = [/\n/g, /\t/g, /\./g, /,/g, /\?/g, /�/g, /!/g, /�/g, /:/g, /\|/g, /\(/g, /\)/g, /-/g, /�/g, /"/g, /'/g, /`/g, /%/g]
  symbols.forEach((symbol) => {
    txt = txt.replace(symbol, ' ') // Destroy puctuation (note spaces)
  })
  txt = txt.replace('rt ', '') // Destroy RT signals
  txt = txt.replace(/#\w*/g, '') // Destroy hastags
  txt = txt.replace(/@(\w){0,15}/g, '') // Destroy twitter handles
  txt = txt.replace(/\u2026/g, '') // Destroy ellipses
  txt = txt.replace(/\u201D/g, '') // Destroy right quotation marks
  txt = txt.replace(/[0-9]/g, '') // Destroy numbers
  txt = txt.split(' ').filter((e) => e !== ' ' && e !== '' && stopwords.indexOf(e.toLowerCase()) < 0).join(' ') // Destroy stopwords for relevant languages

  return txt
}

/// //////////////////////////////////////
// OBJECTS TO GENERATE RANDOM STRINGS
/// //////////////////////////////////////
module.exports.pseudoMarkovNetwork = (function pseudoMarkovNetworkGenerate (nomenclator, overrideMapping) {
  const mapping = overrideMapping || ((e) => e.lugar)
  const pseudoMarkovNetwork = nomenclator.map(mapping).reduce((a, e) => {
    const currentString = e
    a.start[currentString[0]] = a.start[currentString[0]] || {}
    a.start[currentString[0]].count = (a.start[currentString[0]].count || 0) + 1
    return currentString.split('').reduce((a, e, i) => {
      const currentLetter = currentString[i]
      const nextLetter = i + 1 >= currentString.length ? 'end' : currentString[i + 1]
      a[currentLetter] = a[currentLetter] || {}
      a[currentLetter][nextLetter] = a[currentLetter][nextLetter] || {}
      a[currentLetter][nextLetter].count = (a[currentLetter][nextLetter].count || 0) + 1

      return a
    }, a)
  }, { start: {} })

    ; (function normalize (markov) {
      Object.keys(markov).forEach((e) => {
        const currentElement = markov[e]
        const sumOfCounts = Object.keys(currentElement).reduce((a, e) => a + currentElement[e].count, 0)

        Object.keys(currentElement).forEach((e) => {
          currentElement[e].probability = currentElement[e].count / sumOfCounts
        })
      })
      return markov
    })(pseudoMarkovNetwork)

  function chooseRandomNextElement (currentElement) {
    const element = currentElement || 'start'
    var dice = Math.random()
    return Object.keys(this[element]).find((e) => { dice -= this[element][e].probability; return dice <= 0 })
  }
  pseudoMarkovNetwork.chooseRandomNextElement = chooseRandomNextElement.bind(pseudoMarkovNetwork)

  pseudoMarkovNetwork.makeString = function makeString () {
    var string = ''

    do {
      const currentElement = (string.length - 1 >= 0 ? string[string.length - 1] : null)
      const nextElement = this.chooseRandomNextElement(currentElement)
      if (nextElement === 'end') {
        break
      }
      string += nextElement
    } while (true)

    return string
  }

  return pseudoMarkovNetwork
}(nomenclator))

module.exports.trueMarkovNetwork = (function trueMarkovNetworkGenerate (nomenclator) {
  const trueMarkovNetwork = {}
  nomenclator.forEach((e) => {
    var positionString = ''
    e.lugar.split('').forEach((e) => {
      var position = trueMarkovNetwork
      positionString.split('').forEach((e) => {
        position = position.next[e]
      })

      position.next = position.next || {}
      position.next[e] = position.next[e] || {}
      position.next[e].count = (position.next[e].count || 0) + 1

      positionString = positionString + e
    })
  })

  function normalizeNextableObject (nextableObject) {
    const nexts = Object.keys(nextableObject.next)
    const sumOfCounts = nexts.reduce((a, e) => a + nextableObject.next[e].count, 0)
    nexts.forEach((e) => {
      if (nextableObject.next[e].next != null) {
        normalizeNextableObject(nextableObject.next[e])
      }
      nextableObject.next[e].probability = nextableObject.next[e].count / sumOfCounts
    })

    return nextableObject
  }

  normalizeNextableObject(trueMarkovNetwork)

  trueMarkovNetwork.makeString = function makeString () {
    var rval = ''
    var position = trueMarkovNetwork
    do {
      var dice = Math.random()
      const next = Object.keys(position.next).find((e) => { dice -= position.next[e].probability; return dice <= 0 })
      rval += next
      position = position.next[next]

      if (position.next == null) {
        break
      }
    } while (true)

    return rval
  }

  return trueMarkovNetwork
}(nomenclator))

module.exports.refraneiro = (async function generateRefraneiro () {
  const allRequests = await Promise.all(
    new Array(20)
      .fill(request.get)
      .map((e, i) => e({
        url: `http://refraneirogalego.com/page/${i + 1}/`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36' // Yes, I am `actually' Chrome running on Windows! (to bypass throttling)
        }
      }).catch((error) => {
        console.error('Getting Refraneiro: Error: %s -> %s', error.options.url, error.statusCode || '(Not Sure Of The Code)')
        return ''
      }))
  )

  const rval = allRequests
    .map((e) => cheerio.load(e)('article h1 a').toArray().map((e) => e.children[0]).filter((e) => e.type === 'text').map((e) => e.data))
    .reduce((a, e) => a.concat(e), [])
  rval.makeString = function () {
    return this[Math.floor((Math.random() * this.length))]
  }
  return rval
}())
