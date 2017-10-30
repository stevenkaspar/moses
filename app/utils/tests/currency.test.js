const currency = require('../currency')

const ONE_BITCOIN_OF_SATOSHIS = 100000000

test(`Convert ${ONE_BITCOIN_OF_SATOSHIS} satoshis to one bitcoin`, () => {
  expect(currency.satoshisToBitcoin(ONE_BITCOIN_OF_SATOSHIS)).toBe(1)
})

test(`Convert 1 bitcoin to equivalent satoshis (${ONE_BITCOIN_OF_SATOSHIS})`, () => {
  expect(currency.bitcoinToSatoshis(1)).toBe(ONE_BITCOIN_OF_SATOSHIS)
})
