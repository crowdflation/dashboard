import Head from 'next/head'
import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import _ from 'lodash'
import axios from 'axios'
import {AutoSizer, List} from 'react-virtualized'
import { FlexibleWidthXYPlot, XAxis, YAxis, HorizontalGridLines, LineSeries, DiscreteColorLegend} from 'react-vis'
import { getDates } from '../lib/util/dates';

class Inflation extends Component {

  constructor(props: any) {
    super(props);
    this.state = {
      column: null,
      data: [],
      direction: null,
      errors: null,
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleReload(this.state);
  }

  handleChange = (e: any) => {
    this.setState({
      ...this.state,
      [e.target.name]: e.target.value
    });
  }

  buildQueryURL = (state) => {
    return ['find', 'sort', 'aggregate'].reduce((str, key) => {
      if(!state[key]) {
        return str;
      }
      if(str!=='') {
        str +='&';
      }
      str += key + '=' + encodeURIComponent(state[key]);
      return str;
    }, '');
  }

  tryGetErrorMessage(error) {
    try {
      return JSON.stringify(error?.response?.data, null, 2);
    } catch (e) {
      return error.toString();
    }
  }

  handleReload = (state) => {
    let errors: any = ['find', 'sort', 'aggregate'].reduce((errors, key) => {
      if(!state[key]) {
        return errors;
      }
      try {
        JSON.parse(state[key]);
      } catch (e) {
        errors[key] = e.toString();
      }
      return errors;
    }, {});
    if(_.isEmpty(errors)) {
      errors = null;
    } else {
      this.setState({
        ...state,
        errors
      });
      return;
    }

    // Make a request for a user with a given ID
    axios.get('/api/inflation'+'?' + this.buildQueryURL(state))
      .then((response) => {
        // handle success
        this.setState({
          ...state,
          errors,
          error: null,
          inflationInDayPercent: response.data.inflationInDayPercent,
          from: response.data.from,
          to: response.data.to,
          country: response.data.country
        });
      }).catch((error) => {
        this.setState({
          ...state,
          error: this.tryGetErrorMessage(error),
          data: []
      });
    });
  };

  render = () => {
    const { inflationInDayPercent, from, to, country } = this.state as any;
    const days = getDates(new Date(from), new Date(to));

    let chart:any;


    // If it is an array we can show a table
    let categories = {};
    categories[country] = [];
    days.forEach((day) => {
      categories[country].push({x: day, y: !inflationInDayPercent[day]?0:inflationInDayPercent[day] })
    });

    const series = _.map(categories, (value, key) => {
      return (
        <LineSeries
          data={value} key={key}/>
      )
    });


    chart = (
      <div style={{width:'100%'}}>
        <h1>Inflation in US</h1>
        <FlexibleWidthXYPlot
          xType="ordinal"
          height="300">
          <HorizontalGridLines />
          {series}
          <XAxis tickLabelAngle={-25}/>
          <YAxis />
        </FlexibleWidthXYPlot>
      </div>);

    return (
      <div className={styles.container}>
        <Head>
          <title>Crowdflation - Alternative Inflation Calculation</title>
        </Head>
        {chart}
      </div>
    )
  }
}

export default Inflation