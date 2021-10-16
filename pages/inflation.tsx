import Head from 'next/head'
import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import _ from 'lodash'
import axios from 'axios'
import {AutoSizer, List} from 'react-virtualized'
import { FlexibleWidthXYPlot, XAxis, YAxis, HorizontalGridLines, LineSeries, DiscreteColorLegend} from 'react-vis'
import { getDates } from '../lib/util/dates';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import moment from 'moment';
// @ts-ignore
import { formatDate, parseDate } from 'react-day-picker/moment';
import Helmet from 'react-helmet';
import {calculateInflation} from './api/inflation';

export async function getServerSideProps() {
  const resultObject = await calculateInflation({});
  return {
    props: {resultObject}, // will be passed to the page component as props
  }
}

class Inflation extends Component {

  constructor(props: any) {
    super(props);
    this.state = {
      column: null,
      inflationInDayPercent: props.resultObject.inflationInDayPercent,
      direction: null,
      errors: null,
      from: props.resultObject.from,
      to: props.resultObject.to,
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleReload(this.state);
    this.handleFromChange = this.handleFromChange.bind(this);
    this.handleToChange = this.handleToChange.bind(this);
  }


  showFromMonth() {
    const { from, to } = this.state as any;
    if (!from) {
      return;
    }
    if (moment(to).diff(moment(from), 'months') < 2) {
      (this as any).to.getDayPicker().showMonth(from);
    }
  }

  handleFromChange(from) {
    // Change the from date and focus the "to" input field
    this.setState({ from });
  }

  handleToChange(to) {
    this.setState({ to }, this.showFromMonth);
  }

  handleChange = (e: any) => {
    this.setState({
      ...this.state,
      [e.target.name]: e.target.value
    });
  };

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
  };

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
    const { inflationInDayPercent, country } = this.state as any;
    let {from, to} = this.state as any;
    from = new Date(from);
    to = new Date(to);
    const days = getDates(from, to);

    const modifiers = { start: from, end: to };

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
        <div className="InputFromTo">
          <DayPickerInput
            value={from}
            placeholder="From"
            format="LL"
            formatDate={formatDate}
            parseDate={parseDate}
            dayPickerProps={{
              selectedDays: [from, { from, to }],
              disabledDays: { after: new Date() },
              toMonth: to,
              modifiers,
              numberOfMonths: 2,
              onDayClick: () => (this as any).to.getInput().focus(),
            }}
            onDayChange={this.handleFromChange}
          />{' '}
          —{' '}
          <span className="InputFromTo-to">
          <DayPickerInput
            ref={el => ((this as any).to = el)}
            value={to}
            placeholder="To"
            format="LL"
            formatDate={formatDate}
            parseDate={parseDate}
            dayPickerProps={{
              selectedDays: [from, { from, to }],
              disabledDays: { before: from },
              modifiers,
              month: from,
              fromMonth: from,
              numberOfMonths: 2,
            }}
            onDayChange={this.handleToChange}
          />
        </span>
          <Helmet>
            <style>{`
  .InputFromTo .DayPicker-Day--selected:not(.DayPicker-Day--start):not(.DayPicker-Day--end):not(.DayPicker-Day--outside) {
    background-color: #f0f8ff !important;
    color: #4a90e2;
  }
  .InputFromTo .DayPicker-Day {
    border-radius: 0 !important;
  }
  .InputFromTo .DayPicker-Day--start {
    border-top-left-radius: 50% !important;
    border-bottom-left-radius: 50% !important;
  }
  .InputFromTo .DayPicker-Day--end {
    border-top-right-radius: 50% !important;
    border-bottom-right-radius: 50% !important;
  }
  .InputFromTo .DayPickerInput-Overlay {
    width: 550px;
  }
  .InputFromTo-to .DayPickerInput-Overlay {
    margin-left: -198px;
  }
`}</style>
          </Helmet>
        </div>
        <FlexibleWidthXYPlot
          xType="ordinal"
          height={300}>
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