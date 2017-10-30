// @flow
import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import request from 'request'
const bitcoin = require('bitcoinjs-lib')

import currency from '../utils/currency'

import PropTypes from 'prop-types'

export default class TransactionBuilder extends Component {

  constructor(){
    super()

    this.state = {
      inputs:                    [],
      outputs:                   [],
      transaction_hex:           '',
      transaction_hex_error:     '',
      transaction_post_response: '',
      posting_transaction:       false,
      remaining: {
        satoshis: 0,
        bitcoin:  0.000000,
        usd:      0.00
      }
    }

    this.getTransaction  = this.getTransaction.bind(this)
    this.postTransaction = this.postTransaction.bind(this)
    this.clearInputs     = this.clearInputs.bind(this)
  }

  get key(){
    try {
      return bitcoin.ECPair.fromWIF(this.props.private_key)
    }
    catch(e){
      return null
    }
  }

  get public_address(){
    return this.key ? this.key.getAddress() : ''
  }

  getRemaining({inputs = this.state.inputs, outputs = this.state.outputs}){
    let total_output = 0
    let total_input  = 0
    for(let input of inputs){
      total_input += parseInt(input.value)
    }
    for(let output of outputs){
      total_output += parseInt(output.satoshis)
    }

    return this.getAllCurrencies({key: 'satoshis', value: total_input - total_output })
  }


  addInput({hash, index, value}){
    this.state.inputs.push({
      hash: hash,
      index: index,
      value: value
    })
    this.setState({
      inputs:          this.state.inputs,
      remaining:       {...this.getRemaining({inputs: this.state.inputs})},
      transaction_hex: ''
    })
  }

  getAvailableTransactionOutputs(){
    let jsx = []


    for(let tx of this.props.address_json.txs){
      for(let i = 0, l = tx.out.length; i < l; i++){
        let output = tx.out[i]
        if(output.addr === this.public_address){
          jsx.push(
            <div key={output.tx_index} className='py-2'>
              <h6>{tx.hash}</h6>
              <div>
                {currency.satoshisToBitcoin(output.value)} - ({output.spent ? 'spent' : 'unspent'}) - index [{i}]
              </div>
              <button className='btn btn-sm btn-success' onClick={event => {
                this.addInput({
                  hash:  tx.hash,
                  index: i,
                  value: output.value
                })
              }} disabled={output.spent}>Add Input</button>
            </div>
          )
        }
      }
    }

    return jsx

  }

  getInputsJSX(){
    let jsx = []

    for(let input of this.state.inputs){
      jsx.push(
        <div key={input.hash}>
          <h6>{input.hash}</h6>
          <h4>{currency.satoshisToBitcoin(input.value)}</h4>
        </div>
      )
    }

    return jsx
  }

  getAllCurrencies({key, value}){
    let satoshis, bitcoin, usd;

    if(key === 'satoshis'){
      satoshis = Math.floor(value)
      bitcoin  = currency.satoshisToBitcoin(satoshis)
      usd      = parseFloat((bitcoin * this.props.usd_per_btc).toFixed(2))
    }
    else if(key === 'bitcoin'){
      bitcoin  = parseFloat(value.toFixed(9))
      satoshis = currency.bitcoinToSatoshis(bitcoin)
      usd      = parseFloat((bitcoin * this.props.usd_per_btc).toFixed(2))
    }
    else if(key === 'usd'){
      value    = parseFloat(value)
      usd      = parseFloat(value.toFixed(2))
      bitcoin  = parseFloat((usd / this.props.usd_per_btc).toFixed(9))
      satoshis = currency.bitcoinToSatoshis(bitcoin)
    }
    return {satoshis, bitcoin, usd}
  }

  handleOutputChange = (i, field) => (evt) => {

    const new_outputs = this.state.outputs.map((output, si) => {
      if (i !== si) return output;

      if(field.match(/(satoshis|bitcoin|usd)/i)){
        return {
          ...output,
          ...this.getAllCurrencies({key: field, value: evt.target.value})
        }
      }
      return {...output, [field]: evt.target.value}
    });

    this.setState({
      outputs:         new_outputs,
      remaining:       {...this.getRemaining({outputs: new_outputs})},
      transaction_hex: ''
    })
  }


  handleAddOutput = () => {
    this.state.outputs = this.state.outputs.concat([{
      address: '',
      satoshis: 0,
      bitcoin:  0.000000000,
      usd:      0.00
    }])
    this.setState({
      outputs:         this.state.outputs,
      remaining:       {...this.getRemaining({outputs: this.state.outputs})},
      transaction_hex: ''
    })
  }

  handleRemoveOutput = (i) => () => {
    this.state.outputs = this.state.outputs.filter((s, si) => i !== si)
    this.setState({
      outputs:         this.state.outputs,
      remaining:       {...this.getRemaining({outputs: this.state.outputs})},
      transaction_hex: ''
    })
  }

  getTransaction(){
    let tx = new bitcoin.TransactionBuilder()
    try {
      for(let input of this.state.inputs){
        tx.addInput(input.hash, input.index)
      }
      for(let output of this.state.outputs){
        tx.addOutput(output.address, parseInt(output.satoshis))
      }
      tx.sign(0, this.key)
      const transaction_hex = tx.build().toHex()
      this.setState({
        transaction_hex:       transaction_hex,
        transaction_hex_error: ''
      })
    }
    catch(e){
      this.setState({
        transaction_hex:       '',
        transaction_hex_error: e.message
      })
    }
  }

  postTransaction(){
    this.setState({
      posting_transaction: true
    })
    request({
      method: 'post',
      url: 'https://blockchain.info/pushtx',
      form: {
        'tx': this.state.transaction_hex
      }
    }, (error, response, body) => {
      console.log(error, response, body)
      this.setState({
        posting_transaction:       false,
        transaction_post_response: body
      })
    })
  }

  clearInputs(){
    this.setState({
      inputs:          [],
      transaction_hex: '',
      transaction_post_response: '',
      remaining: {satoshis: 0, bitcoin: 0.000000000, usd: 0.00}
    })
  }

  render() {
    return (
      <div className='container-fluid'>
        <div className='row pb-2'>
          <div className='col-12'>
            <h5>Current USD price per BTC</h5>
            ${this.props.usd_per_btc} - <button className='btn btn-sm btn-info' onClick={this.props.fetchUSDPerBTC}>update</button>
          </div>
        </div>
        <div className='row pb-2'>
          <div className='col-12 col-sm-6 py-1 py-sm-0'>
            <h5>Available Inputs</h5>
            {this.getAvailableTransactionOutputs()}
          </div>
          <div className='col-12 col-sm-6 py-1 py-sm-0'>
            <h5>
              Chosen Inputs
              <button className='ml-2 btn btn-sm btn-secondary' onClick={this.clearInputs}>clear</button>
            </h5>
            {this.getInputsJSX()}
          </div>
        </div>
        <div className='row pb-2'>
          <div className='col-12'>
            <h5>Add Outputs to send BTC to</h5>
            <div className='input-group mb-1'>
              <input
                className='form-control'
                type='text'
                value={'Fee'}
                disabled={true}
              />
              <input
                className='form-control'
                type='text'
                value={`${this.state.remaining.satoshis} - satoshis`}
                disabled={true}
              />
              <input
                className='form-control'
                type='text'
                value={`${this.state.remaining.bitcoin} - bitcoin`}
                disabled={true}
              />
              <input
                className='form-control'
                type='text'
                value={`${this.state.remaining.usd} - usd`}
                disabled={true}
              />
              <span className='input-group-btn'>
                <button className='btn btn-secondary' type='button'>$</button>
              </span>
            </div>

            {this.state.outputs.map((dir, i) => (
              <div className='input-group mb-1' key={i}>
                <input
                  className='form-control'
                  type='text'
                  placeholder={`Output #${i + 1} address`}
                  value={dir.address}
                  onChange={this.handleOutputChange(i, 'address')}
                />
                <input
                  className='form-control'
                  type='number'
                  placeholder={`Output #${i + 1} satoshis`}
                  value={dir.satoshis}
                  onChange={this.handleOutputChange(i, 'satoshis')}
                />
                <input
                  className='form-control'
                  type='number'
                  placeholder={`Output #${i + 1} bitcoin`}
                  value={dir.bitcoin}
                  onChange={this.handleOutputChange(i, 'bitcoin')}
                />
                <input
                  className='form-control'
                  type='number'
                  placeholder={`Output #${i + 1} usd`}
                  value={dir.usd}
                  onChange={this.handleOutputChange(i, 'usd')}
                />
                <span className='input-group-btn'>
                  <button className='btn btn-danger' onClick={this.handleRemoveOutput(i)}  type='button'>-</button>
                </span>
              </div>
            ))}
            <button type='button' onClick={this.handleAddOutput} className='btn btn-block btn-primary'>
              Add Output
            </button>
          </div>
        </div>
        <div className='row pb-2'>
          <div className='col-12'>
            <button className='btn btn-success btn-block' onClick={this.getTransaction}>Get Transaction</button>
          </div>
        </div>
        <div className='row pb-2'>
          <div className='col-12' style={{'wordBreak': 'break-all'}}>
            {
              this.state.transaction_hex.length > 0 ?
              <div>
                <h5>Transaction To Be Posted</h5>
                <div className='bg-light p-2'>
                  {this.state.transaction_hex}
                </div>
              </div>
              : null
            }
          </div>
        </div>
        <div className='row pb-2'>
          <div className='col-12' style={{'wordBreak': 'break-all'}}>
            {
              this.state.transaction_hex_error.length > 0 ?
                <div className='bg-danger text-white p-2'>
                  {this.state.transaction_hex_error}
                </div>
              : null
            }
          </div>
        </div>
        <div className='row pb-2'>
          <div className='col-12' style={{'wordBreak': 'break-all'}}>
            {
              (this.state.transaction_hex.length > 0) ?
                <button className='btn btn-dark btn-lg btn-block' onClick={this.postTransaction} disabled={this.state.posting_transaction}>POST TX</button>
              : null
            }
            <div>
              {this.state.transaction_post_response}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

TransactionBuilder.propTypes = {
  private_key:    PropTypes.string.isRequired,
  address_json:   PropTypes.object.isRequired,
  usd_per_btc:    PropTypes.number.isRequired,
  fetchUSDPerBTC: PropTypes.func.isRequired
}
