import Head from 'next/head'
import styles from '../styles/Home.module.css'
import React, {Component} from 'react'
import _ from 'lodash'
import axios from 'axios'
import {AutoSizer, List} from 'react-virtualized'
import {DiscreteColorLegend, FlexibleWidthXYPlot, HorizontalGridLines, LineSeries, XAxis, YAxis} from 'react-vis'
import {getDates} from '../lib/util/dates';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import moment from 'moment';
// @ts-ignore
import {formatDate, parseDate} from 'react-day-picker/moment';
import Helmet from 'react-helmet';
import {calculateInflation} from './api/inflation';
import MapComponent from '../components/map-component';
import DropdownTreeSelect from 'react-dropdown-tree-select';
import 'react-dropdown-tree-select/dist/styles.css';
import data, {default as categories} from '../data/categories';


export async function getServerSideProps() {
  const resultObject = await calculateInflation({});
  return {
    props: {resultObject}, // will be passed to the page component as props
  }
}


class Inflation extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      column: null,
      inflationInDayPercent: props.resultObject.inflationInDayPercent,
      direction: null,
      errors: null,
      from: props.resultObject.from,
      to: props.resultObject.to,
      lat: 37.09024,
      lng: -95.712891,
      radius: 1900,
      basket: [],
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleReload(this.state);
    this.handleFromChange = this.handleFromChange.bind(this);
    this.handleToChange = this.handleToChange.bind(this);
  }


  onChange(currentNode, selectedNodes) {
    console.log('onChange::', currentNode, selectedNodes);
    let basket: string[] = [];
    _.map(selectedNodes, (item: any) => {
      basket.push(item.label);
    });
    this.setState({ basket });
  }

  onAction(node, action) {
    console.log('onAction::', action, node)
  }

  onNodeToggle(currentNode) {
    console.log('onNodeToggle::', currentNode)
  }


  showFromMonth() {
    const {from, to} = this.state as any;
    if (!from) {
      return;
    }
    if (moment(to).diff(moment(from), 'months') < 2) {
      (this as any).to.getDayPicker().showMonth(from);
    }
  }

  handleFromChange(from) {
    // Change the from date and focus the "to" input field
    this.setState({from});
  }

  handleToChange(to) {
    this.setState({to}, this.showFromMonth);
  }

  handleChange = (e: any) => {
    this.setState({
      ...this.state,
      [e.target.name]: e.target.value
    });
  };

  buildQueryURL = (state) => {
    return ['from', 'to', 'aggregate', 'lat', 'lng', 'radius', 'basket'].reduce((str, key) => {
      if (!state[key]) {
        return str;
      }
      if (str !== '') {
        str += '&';
      }

      if(key === 'basket') {
        str += key + '=' + encodeURIComponent(JSON.stringify(state[key]));
        return str;
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
    let errors: any = ['radius', 'lng', 'lat'].reduce((errors, key) => {
      if (!state[key]) {
        return errors;
      }
      try {
        JSON.parse(state[key]);
      } catch (e) {
        errors[key] = e.toString();
      }
      return errors;
    }, {});
    if (_.isEmpty(errors)) {
      errors = null;
    } else {
      this.setState({
        ...state,
        errors
      });
      return;
    }

    // Make a request for a user with a given ID
    axios.get('/api/inflation' + '?' + this.buildQueryURL(state))
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

  updateToMatch = (item, basket) => {
    item.checked = (basket.indexOf(item.label)!==-1);
    if(item.children) {
      item.children.forEach((c) => {
        this.updateToMatch(c, basket);
      });
    }
  };

  render = () => {
    const {inflationInDayPercent, country, errors, lat, lng, radius, basket} = this.state as any;
    const that = this;
    let {from, to} = this.state as any;
    from = new Date(from);
    to = new Date(to);
    const days = getDates(from, to);
    this.updateToMatch(data, basket);

    const modifiers = {start: from, end: to};

    let chart: any;


    // If it is an array we can show a table
    let categories = {};
    categories[country] = [];
    days.forEach((day) => {
      categories[country].push({x: day, y: !inflationInDayPercent[day] ? 0 : inflationInDayPercent[day]})
    });

    const series = _.map(categories, (value, key) => {
      return (
        <LineSeries
          data={value} key={key}/>
      )
    });


    chart = (
      <div style={{width: '100%'}}>
        <h1>Inflation in US</h1>
        <div>
          <span className={styles.error}>{errors && errors["lng"]}</span>
          <p>Area to calculate inflation in (US only for now):</p>
          <span>Longitude</span>
          <span className={styles.error}>{errors && errors["lng"]}</span>
          <input name='lng' onChange={this.handleChange} value={lng}/>
          <span>Latitude</span>
          <span className={styles.error}>{errors && errors["lat"]}</span>
          <input name='lat' onChange={this.handleChange} value={lat}/>
          <span>Distance (miles)</span>
          <span className={styles.error}>{errors && errors["radius"]}</span>
          <input name='radius' onChange={this.handleChange} value={radius}/>
        </div>
        <div style={{position: 'relative', height: '500px'}}>
          <MapComponent lat={lat} lng={lng} radius={radius * 1609.34}/>
        </div>
        <p>Select individual basket of goods:</p>
        <DropdownTreeSelect data={data} onChange={that.onChange.bind(that)} onAction={this.onAction}
                            onNodeToggle={this.onNodeToggle}/>
        <p>Date range for inflation calculation:</p>
        <div className="InputFromTo">
          <DayPickerInput
            value={from}
            placeholder="From"
            format="LL"
            formatDate={formatDate}
            parseDate={parseDate}
            dayPickerProps={{
              selectedDays: [from, {from, to}],
              disabledDays: {after: new Date()},
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
              selectedDays: [from, {from, to}],
              disabledDays: {before: from},
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
        <p>Inflation per Day:</p>
        <button onClick={() => this.handleReload(this.state)}>Recalculate</button>
        <FlexibleWidthXYPlot
          xType="ordinal"
          height={300}>
          <HorizontalGridLines/>
          {series}
          <XAxis tickLabelAngle={-25}/>
          <YAxis/>
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

export default Inflation;
