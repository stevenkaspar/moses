
let bitcoinToSatoshis = bitcoin => Math.floor(bitcoin * 100000000)
let satoshisToBitcoin = satoshis => parseFloat((satoshis / 100000000).toFixed(9))

export default {
  bitcoinToSatoshis,
  satoshisToBitcoin
}
