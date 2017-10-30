// @flow
import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import request from 'request'
import moment  from 'moment'
const bitcoin = require('bitcoinjs-lib')

import currency from '../utils/currency'

import TransactionBuilder from './TransactionBuilder'
import AddressHistoricalGraph from './AddressHistoricalGraph'

const ADDRESS_ENDPOINT = `https://blockchain.info/rawaddr/`
const DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a'

export default class Home extends Component {

  constructor(){
    super()

    this.state = {
      private_key:  'ENTER YOUR PRIVATE KEY HERE',
      address_json: {
        txs: [],
        final_balance: 0
      },
      usd_per_btc: 0.00
    }

    this.fetchUSDPerBTC = this.fetchUSDPerBTC.bind(this)
    this.inputChange    = this.inputChange.bind(this)
    this.getAddressInfo = this.getAddressInfo.bind(this)

    this.fetchUSDPerBTC()
  }

  get key(){
    try {
      return bitcoin.ECPair.fromWIF(this.state.private_key)
    }
    catch(e){
      return null
    }
  }

  get public_address(){
    return this.key ? this.key.getAddress() : ''
  }

  get info_url(){
    return `${ADDRESS_ENDPOINT}${this.public_address}`
  }


  fetchUSDPerBTC(){
    request({
      method: 'get',
      url: 'https://blockchain.info/ticker'
    }, (error, response, body) => {
      body = JSON.parse(body)
      this.setState({
        usd_per_btc: body.USD.last
      })
    })
  }

  inputChange(event){
    this.setState({
      [event.target.name]: event.target.value
    })
  }

  getAddressInfo(){
    return new Promise((resolve, reject) => {
      request({
        method: 'get',
        url:    this.info_url
      }, (err, response, body) => {
        if(err){
          console.warn(err)
          return reject(err)
        }
        body = JSON.parse(body)
        console.log(body)
        this.setState({
          address_json: body
        })
        resolve(body)
      })
    })
  }

  sortByTime(a, b){
    return a.time > b.time ? 1 : -1
  }

  getAddressTransactionHistoryJSX(){
    let jsx = []

    let txs_sorted = this.state.address_json.txs.sort(this.sortByTime)

    for(let tx of txs_sorted){
      let inputs_jsx   = []
      let outputs_jsx  = []
      let input_total  = 0
      let output_total = 0

      for(let input of tx.inputs){
        inputs_jsx.push(
          <div key={input.prev_out.script}>
            <div>{input.prev_out.addr} - {currency.satoshisToBitcoin(input.prev_out.value)}</div>
          </div>
        )
        input_total += input.prev_out.value
      }

      for(let i = 0, l = tx.out.length; i < l; i++){
        let output = tx.out[i]
        output_total += output.value

        outputs_jsx.push(
          <div key={output.script}>
            <div>
              {output.addr} - {currency.satoshisToBitcoin(output.value)} - ({output.spent ? 'spent' : 'unspent'})
            </div>
            {
              i === l - 1 ?
                <div>Fee - {currency.satoshisToBitcoin(input_total - output_total)}</div>
              : null
            }
          </div>
        )
      }

      jsx.unshift(
        <div key={tx.tx_index} className='row py-1 border border-top-0 border-right-0 border-left-0'>
          <div className='col-12 col-sm-6 py-2'>
            <h6>Inputs</h6>
            {inputs_jsx}
          </div>
          <div className='col-12 col-sm-6 py-2'>
            <h6>Outputs</h6>
            {outputs_jsx}
          </div>
          <div className='col-12 text-muted small'>
            {moment.unix(tx.time).format(DATE_FORMAT)}
          </div>
        </div>
      )

    }

    return jsx

  }

  render() {
    return (
      <div className='container'>
        <div className='row pb-3'>
          <div className='col-12'>
            <h3>Private Key</h3>
            <div className='container-fluid'>
              <div className='row'>
                <div className='col-12'>
                  <input className='form-control' type='text' value={this.state.private_key} name='private_key' onChange={this.inputChange}/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='row pb-3'>
          <div className='col-12'>
            <h3>Public Address</h3>
            <div className='container-fluid'>
              <div className='row'>
                <div className='col-12'>
                  <h4>
                    {this.public_address}
                  </h4>
                  <button className='btn btn-block btn-success' onClick={this.getAddressInfo}>Get Public Address Info</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='row pb-3'>
          <div className='col-12'>
            <h3>Address Current Value</h3>
            <div className='container-fluid'>
              <div className='row'>
                <div className='col-12'>
                  <div className='display-4'>
                    {currency.satoshisToBitcoin(this.state.address_json.final_balance)} - ${(currency.satoshisToBitcoin(this.state.address_json.final_balance) * this.state.usd_per_btc).toFixed(2)}
                  </div>
                  <h5>Current USD price per BTC</h5>
                  ${this.state.usd_per_btc} - <button className='btn btn-sm btn-info' onClick={this.fetchUSDPerBTC}>update</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='row pb-3'>
          <div className='col-12'>
            <h3>Historical Graph of Address Value</h3>
            <AddressHistoricalGraph
              usd_per_btc={this.state.usd_per_btc}
              address_json={this.state.address_json}/>
          </div>
        </div>
        <div className='row pb-3'>
          <div className='col-12'>
            <h3>Transaction History</h3>
            <div className='container-fluid'>
              {this.getAddressTransactionHistoryJSX()}
            </div>
          </div>
        </div>
        <div className='row pb-3'>
          <div className='col-12'>
            <h3>Transaction Builder</h3>
            <TransactionBuilder
              usd_per_btc={this.state.usd_per_btc}
              fetchUSDPerBTC={this.fetchUSDPerBTC}
              private_key={this.state.private_key}
              address_json={this.state.address_json}/>
          </div>
        </div>
      </div>
    );
  }
}
