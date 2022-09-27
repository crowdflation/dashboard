import Head from 'next/head'
import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import _ from 'lodash'
import axios from 'axios'
import {FlexibleWidthXYPlot, HorizontalGridLines, LineSeries, MarkSeries, XAxis, YAxis} from 'react-vis'
import {periods} from '../lib/util/dates';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import moment from 'moment';
// @ts-ignore
import {formatDate, parseDate} from 'react-day-picker/moment';
import Helmet from 'react-helmet';
import {calculateInflation} from './api/inflation';
import MapComponent  from '../components/map-component';
import DropdownTreeSelect from 'react-dropdown-tree-select';
import 'react-dropdown-tree-select/dist/styles.css';
import data from '../data/categories';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Image from "next/dist/client/image";
import Button from "@mui/material/Button";
import CachedIcon from '@mui/icons-material/Cached';
import MenuItem from "@mui/material/MenuItem";
import Select from "@material-ui/core/Select";
import {Box, CircularProgress, FormControlLabel, Radio, RadioGroup, Alert} from '@mui/material';
import {connectToDatabase, getVendorNames, getVendors} from "../lib/util/mongodb";
import { codeToCountryMap } from '../data/countries';
import { locations } from '../data/locations';

export async function getServerSideProps() {
    const {db} = await connectToDatabase();
    const resultObject = await calculateInflation(db,{});

    const vendorObjects = (await getVendors(db)).map(v=> { return {...v, _id:v._id.toString()} });
    const vendorsNames = vendorObjects.filter(v=>!v.country || v.country=='US').map(v => v.name);

    let vendorsFilterSelect = { label :
        "All vendors",
            value :
        "All vendors",
            children :
                vendorsNames.map((v)=>{ return {label:v, value:v, checked:true}})
    };

    console.log('vendorObjects',vendorObjects);

    let countryCodes = {};
    vendorObjects.map((v:any)=>{ return v.country && (countryCodes[v.country]=v.country);});
    countryCodes['US'] = 'US';
    countryCodes['TR'] = 'TR';
    countryCodes['GB'] = 'GB';

    const countries = Object.keys(countryCodes).map(c=>codeToCountryMap[c]);


    const apiKey: string = (process.env as any).GOOGLE_MAPS_API_KEY as string;
    return {
        props: {resultObject, apiKey, vendorsFilterSelect, countries, vendorsNames, vendorObjects}, // will be passed to the page component as props
    }
}


class Inflation extends Component<any, any> {
    private vendors: any;
    private countries: any;
    private vendorObjects: any;
    constructor(props: any) {
        super(props);
        this.state = {
            column: null,
            inflationInDayPercent: props.resultObject.inflationInDayPercent,
            totalInflation: props.resultObject.totalInflation,
            direction: null,
            errors: null,
            from: props.resultObject.from,
            to: props.resultObject.to,
            lat: 37.09024,
            lng: -95.712891,
            radius: 1900,
            inProgress: false,
            cumulative: true,
            error: null,
            period: periods.Daily.name,
            vendorsFilterSelect: props.vendorsFilterSelect,
            vendors: props.vendorsNames,
            country: 'US',
            explain: false,
            explanationByDay: null,
            basket: ['Food and beverages', 'Housing', 'Apparel', 'Transportation', 'Medical care', 'Recreation', 'Education and communication', 'Other goods and services'],
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleReload(this.state);
        this.handleFromChange = this.handleFromChange.bind(this);
        this.handleToChange = this.handleToChange.bind(this);
        this.countries = props.countries;
        this.vendorObjects = props.vendorObjects;
    }

    onChange(currentNode, selectedNodes) {
        console.log('onChange::', currentNode, selectedNodes);
        let basket: string[] = [];
        _.map(selectedNodes, (item: any) => {
            basket.push(item.label);
        });
        this.setState({basket});
    }

    onAction(node, action) {
        console.log('onAction::', action, node)
    }

    onChangeVendors(currentNode, selectedNodes) {
        let vendors: string[] = [];
        _.map(selectedNodes, (item: any) => {
            vendors.push(item.label);
        });
        this.setState({vendors});
    }

    onNodeToggle(currentNode) {
        console.log('onNodeToggle::', currentNode)
    }

    showFromMonth() {
        let {from, to} = this.state as any;
        from = new Date(from);
        to = new Date(to);
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
        console.log('handleChange', e.target.name, e.target.value);
        this.setState({
            ...this.state,
            [e.target.name]: e.target.value
        });
    };

    handlePeriodChange = (e) => {
        this.setState({
            ...this.state,
            period: e.target.value
        });
    }

    buildQueryURL = (state) => {
        return ['from', 'to', 'aggregate', 'lat', 'lng', 'radius', 'basket', 'period', 'vendors', 'country', 'explain'].reduce((str, key) => {
            if (!state[key]) {
                return str;
            }
            if (str !== '') {
                str += '&';
            }

            if (key === 'basket' || key === 'vendors') {
                str += key + '=' + encodeURIComponent(JSON.stringify(state[key]));
                return str;
            }

            str += key + '=' + encodeURIComponent(state[key]);
            return str;
        }, '');
    };

    tryGetErrorMessage(error) {
        try {
            if(error?.response?.data?.message) {
                return error?.response?.data?.message;
            }
            return JSON.parse(error?.response?.data);
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
                errors[key] = (e as any).toString();
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

        this.setState({
            ...state,
            error: null,
            inProgress: true
        });

        // Make a request for a user with a given ID
        axios.get('/api/inflation' + '?' + this.buildQueryURL(state))
            .then((response) => {
                // handle success
                this.setState({
                    ...state,
                    errors,
                    error: null,
                    inProgress: false,
                    inflationInDayPercent: response.data.inflationInDayPercent,
                    inflationOnLastDay: response.data.inflationOnLastDay,
                    explanationByDay: response.data.explanationByDay,
                    totalInflation: response.data.totalInflation,
                });
            }).catch((error) => {
            this.setState({
                ...state,
                error: this.tryGetErrorMessage(error),
                inProgress: false,
                inflationInDayPercent: null,
                explanationByDay: null,
                inflationOnLastDay: NaN
            });
        });
    };

    updateToMatch = (item, basket) => {
        item.checked = (basket.indexOf(item.label) !== -1);
        if (item.children) {
            item.children.forEach((c) => {
                this.updateToMatch(c, basket);
            });
        }
    };

    countrySelectChange = (event) => {
        const country = event.target.value;
        const [lat, lng] = locations[country].latLng;
        // Rough approximation of size
        const radius = Math.sqrt(locations[country].area);
        console.log('setting country', country, lat, lng);

        const vendorNames = this.vendorObjects.filter(v=>(!v.country && country=='US') || v.country==country).map(v => v.name);
        let vendorsFilterSelect = { label :
                "All vendors",
            value :
                "All vendors",
            children :
                vendorNames.map((v)=>{ return {label:v, value:v, checked:true}})
        };

        this.setState({...this.state, country: event.target.value, lat, lng, radius, vendorsFilterSelect, vendors: vendorNames });
    }

    render = () => {
        const {
            inflationInDayPercent,
            inflationOnLastDay,
            cumulative,
            country,
            errors,
            lat,
            lng,
            radius,
            basket,
            period,
            inProgress,
            error,
            vendors,
            explain,
            explanationByDay,
            vendorsFilterSelect,
            totalInflation,
        } = this.state as any;
        const that = this;
        let {from, to} = this.state as any;
        from = new Date(from);
        to = new Date(to);
        const days = Object.keys(inflationInDayPercent).sort();
        this.updateToMatch(data, basket);
        this.updateToMatch(vendorsFilterSelect, vendors);

        const modifiers = {start: from, end: to};

        let chart: any;
        // If it is an array we can show a table
        let categories = {};
        categories[country] = [];
        let maxY = 0;
        let minY = 0;
        days.forEach((day) => {
            const y = !inflationInDayPercent[day] ? 0 : inflationInDayPercent[day];
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            categories[country].push({x: day, y})
        });

        const series = _.map(categories, (value:any, key) => {
            let newValue = value;
            if(cumulative==='true' || cumulative===true) {
                let running:number = 0;
                newValue = value.map(({x,y})=> {
                    running += y || 0;
                    return {x, y: running};
                });
            }


            return (
                <LineSeries
                    data={newValue} key={key}/>
            )
        });

        const calculateTickLabelAngle = () => {
            if (days.length < 10) {
                return 0;
            }
            if (days.length > 40) {
                return -90;
            }
            return -25;
        }

        const style = {width: '100%', 'margin-bottom': '100px'};
        const boxStyle = {display: 'flex', 'align-items': 'center', justifyContent: 'center'};

        let explanationComponent:JSX.Element|null = null;
        if (explanationByDay && !inProgress) {
            explanationComponent = (<div><br/><h4>Calculation Explanation</h4>
                {Object.keys(explanationByDay).map((key)=> {
                    return (
                    <div>
                        <p style={{fontWeight:'bold'}}>{key}</p>
                        {explanationByDay[key].map((exp)=>(<p>{exp}</p>))}
                    </div>);
                })}
            </div>)
        }

        chart = (
            <div style={style} className={styles.inflation}>
                <h3>
                    <div className={styles["header-image"]}></div>
                    <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        label="Country"
                        defaultValue='US'
                        className={styles["MuiSelect-select"]}
                        onChange={that.countrySelectChange.bind(that)}
                    >
                        {that.countries.map((c)=>(<MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>))}
                    </Select> {' '}
                    Inflation: {totalInflation || 0}% total for period
                </h3>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >
                        <Typography>Area</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <div className={styles.inputs}>
                            <span className={styles.error}>{errors && errors["lng"]}</span>
                            <p>Area to calculate inflation in:</p>
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
                            <MapComponent lat={lat} lng={lng} radius={radius * 1609.34} apiKey={this.props.apiKey}/>
                        </div>
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        aria-controls="panel2a-content"
                        id="panel2a-header"
                    >
                        <Typography>Goods Basket</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <DropdownTreeSelect data={data} onChange={that.onChange.bind(that)} onAction={this.onAction}
                                            onNodeToggle={this.onNodeToggle}/>
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        aria-controls="panel2a-content"
                        id="panel2a-header"
                    >
                        <Typography>Vendors</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <DropdownTreeSelect data={vendorsFilterSelect} onChange={that.onChangeVendors.bind(that)}/>
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        aria-controls="panel2a-content"
                        id="panel2a-header"
                    >
                        <Typography>Frequency</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <RadioGroup row aria-label="frequency" name="row-radio-buttons-group" value={period}
                                    onChange={this.handlePeriodChange}>
                            {Object.keys(periods).map((p) => {
                                return (<FormControlLabel value={p} control={<Radio/>} label={p}/>);
                            })}
                        </RadioGroup>
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        aria-controls="panel2a-content"
                        id="panel2a-header"
                    >
                        <Typography>Dates Period</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
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
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        aria-controls="panel2a-content"
                        id="panel2a-header"
                    >
                        <Typography>Calculation Cumulative over period</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <RadioGroup row aria-label="cumulative" name="cumulative" value={cumulative}
                                    onChange={this.handleChange}>
                            <FormControlLabel value={true} control={<Radio/>} label='Cumulative'/>
                            <FormControlLabel value={false} control={<Radio/>} label='Individual'/>
                        </RadioGroup>
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon/>}
                        aria-controls="panel2a-content"
                        id="panel2a-header"
                    >
                        <Typography>Calculation Explanation</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <RadioGroup row aria-label="explain" name="explain" value={explain}
                                    onChange={this.handleChange}>
                            <FormControlLabel value={false} control={<Radio/>} label='No Explanation'/>
                            <FormControlLabel value={true} control={<Radio/>} label='Provide Calculation Explanation'/>
                        </RadioGroup>
                    </AccordionDetails>
                </Accordion>
                <div className={styles.recalculateButton}>
                    {error?(<div style={{margin:'10px'}}><Alert severity="error">{error}</Alert></div>):null}
                    <Button onClick={() => this.handleReload(this.state)} variant="contained" endIcon={<CachedIcon/>}>
                        Recalculate Inflation
                    </Button>
                </div>
                {inProgress ? (<Box style={boxStyle}><CircularProgress/></Box>) : (<FlexibleWidthXYPlot
                    xType="ordinal"
                    style={{'margin-bottom': '80px', overflow: 'visible'}}
                    height={300}>
                    <HorizontalGridLines/>
                    {series}
                    <XAxis tickLabelAngle={calculateTickLabelAngle()}/>
                    <YAxis/>
                    <MarkSeries data={[{x: days[0], y: 0},{x: days[0], y: maxY + 0.1},{x: days[0], y: minY-0.1}]} style={{display: 'none'}}/>
                </FlexibleWidthXYPlot>)}
                {explanationComponent}
            </div>);

        return (
            <div className={styles.container}>
                <Head>
                    <title>Crowdflation - Crowdsourced Inflation Calculation</title>
                </Head>
                {chart}
            </div>
        )
    }
}

export default Inflation;
