// @flow
import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import request  from 'request'
import moment   from 'moment'
import {Line}   from 'react-chartjs-2'

import PropTypes from 'prop-types'

const LINE_OPTIONS = {
  scales: {
    xAxes: [{
      type: 'time',
      time: {
        displayFormats: {
           'millisecond': 'MMM DD',
           'second': 'MMM DD',
           'minute': 'MMM DD',
           'hour': 'MMM DD',
           'day': 'MMM DD',
           'week': 'MMM DD',
           'month': 'MMM DD',
           'quarter': 'MMM DD',
           'year': 'MMM DD',
        }
      }
    }]
  }
}

export default class AddressHistoricalGraph extends Component {

  constructor(){
    super()

    this.state = {
      historical_data: []
    }

    this.getHistoricalData()
  }

  getHistoricalData(){
    request({
      method: 'get',
      url: 'https://blockchain.info/charts/market-price?timespan=30days&format=json'
    }, (error, response, body) => {
      this.setState({
        historical_data: JSON.parse(body).values
      })
    })
  }

  getValueAtTime(unix_time){

    const historical_data = this.state.historical_data

    let last_value = 0

    for(let xy of historical_data){
      if(xy.x >= unix_time){
        return last_value
      }
      last_value = xy.y
    }

    return this.props.usd_per_btc
  }

  getLineData(){

    const historical_data = this.state.historical_data

    let bitcoin_holding_dataset = {
      label: 'Address value in USD',
      lineTension: 0,
      data:  []
    }

    let current_value = 0

    for(let tx of this.props.address_json.txs){
      for(let input of tx.inputs){
        if(input.prev_out.addr === this.props.address_json.address){
          current_value -= input.prev_out.value
        }
      }
      for(let output of tx.out){
        if(output.addr === this.props.address_json.address){
          current_value += output.value
        }
      }

      let value_at_time = this.getValueAtTime(tx.time)

      bitcoin_holding_dataset.data.push({
        label: 'test',
        t: AddressHistoricalGraph.formatTxTime(tx.time),
        y: parseFloat(((current_value / 100000000) * value_at_time).toFixed(2))
      })
    }

    return {
      datasets: [
        bitcoin_holding_dataset
      ]
    }
  }

  render() {
    return (
      <div className='container-fluid'>
        <div className='row'>
          <div className='col-12'>
           <Line
             data={this.getLineData()}
             height={100}
             options={LINE_OPTIONS} />
          </div>
        </div>
      </div>
    )
  }

  static formatTxTime(time){
    return moment.unix(time).toDate()
  }
}


AddressHistoricalGraph.propTypes = {
  address_json:   PropTypes.object.isRequired,
  usd_per_btc:    PropTypes.number.isRequired
}
