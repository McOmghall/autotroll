const assert = require('assert')
const util = require('util')
const auxFunctions = require('../aux_functions')

const TWEET_CHARACTER_LIMIT = 280
const LOWER_LIMIT_FOR_PLACE_NAMES = 1
const UPPER_LIMIT_FOR_PLACE_NAMES = 60
const LOWER_LIMIT_FOR_SAYINGS = 18
const UPPER_LIMIT_FOR_SAYINGS = 204
const GENERATE_PHRASES_COUNT = 100000
describe('PCG MODULE in aux_functions.js', function () {
  describe('refraneiro', function () {
    it('should have at least 100 phrases', async function () {
      const sizeOfRefraneiro = (await auxFunctions.refraneiro).length
      console.log('Refraneiro has %s phrases', sizeOfRefraneiro)
      assert.ok(sizeOfRefraneiro >= 100)
    })
    it('should have working makeString()', async function () {
      const saying = (await auxFunctions.refraneiro).makeString()
      assert.ok((typeof saying).toString() === 'string')
    })
    it(`should return a phrase between ${LOWER_LIMIT_FOR_SAYINGS} and ${UPPER_LIMIT_FOR_SAYINGS} characters`, async function () {
      const refraneiro = (await auxFunctions.refraneiro)
      const lengthsInRange = refraneiro.map((e) => Array.from(e)).map((e) => e.length).filter((e) => e <= UPPER_LIMIT_FOR_SAYINGS && e >= LOWER_LIMIT_FOR_SAYINGS).sort((a, b) => b - a).length
      const size = refraneiro.length
      console.log('Lengths outside range %j', lengthsInRange)
      assert.ok(size === lengthsInRange)
    })
  })
  const setFulfillsConditions = async function (generator, limits) {
    for (var i = 0; i < GENERATE_PHRASES_COUNT; i++) {
      const string = await generator.makeString()
      const result = limits(Array.from(string))
      if (!result) {
        console.error('Result %s breaks constraints', string)
      }
      assert.ok(result)
    }
    return true
  }
  describe('pseudoMarkovGenerator', function () {
    it(`should return a phrase between ${LOWER_LIMIT_FOR_PLACE_NAMES} and ${UPPER_LIMIT_FOR_PLACE_NAMES} characters`, async function () {
      this.timeout(10000)
      assert.ok(await setFulfillsConditions(auxFunctions.pseudoMarkovNetwork, (e) => e.length <= UPPER_LIMIT_FOR_PLACE_NAMES && e.length >= LOWER_LIMIT_FOR_PLACE_NAMES))
    })
  })
  describe('trueMarkovGenerator', function () {
    it(`should return a phrase between ${LOWER_LIMIT_FOR_PLACE_NAMES} and ${UPPER_LIMIT_FOR_PLACE_NAMES} characters`, async function () {
      this.timeout(10000)
      assert.ok(await setFulfillsConditions(auxFunctions.trueMarkovNetwork, (e) => e.length <= UPPER_LIMIT_FOR_PLACE_NAMES && e.length >= LOWER_LIMIT_FOR_PLACE_NAMES))
    })
  })
  describe('sayings', function () {
    it(`should return a phrase shorter than ${TWEET_CHARACTER_LIMIT} characters`, async function () {
      this.timeout(10000)
      assert.ok(await setFulfillsConditions(auxFunctions.sayings, (e) => e.length <= TWEET_CHARACTER_LIMIT))
    })
  })
})
