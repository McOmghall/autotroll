const fs = require('fs')

module.exports.cleanData = function (data) {
  const clean = data.map((e) => {
    if (e[''] != null) {
      delete e['']
    }

    const rval = { }
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

module.exports.pseudoMarkovNetwork = function pseudoMarkovNetworkGenerate (nomenclator, overrideMapping) {
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

    ;(function normalize (markov) {
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
}

module.exports.trueMarkovNetwork = function trueMarkovNetworkGenerate (nomenclator) {
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
}
