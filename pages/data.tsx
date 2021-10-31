import Head from 'next/head'
import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import { Table } from 'semantic-ui-react'
import _ from 'lodash'
import axios from 'axios'
import {XYPlot, XAxis, YAxis, HorizontalGridLines, LineSeries, DiscreteColorLegend} from 'react-vis'
import { connectToDatabase } from "../lib/util/mongodb"
import Link from 'next/link'


export async function getServerSideProps({query}) {
  const {db} = await connectToDatabase();
  let vendors = await db.collection('_vendors').find().toArray();
  vendors = vendors.map(v => v.name);
  vendors = _.union(vendors, ['walmart', 'kroger', 'zillow']);
  return {
    props: {vendors, query}, // will be passed to the page component as props
  }
}

class Data extends Component {

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

  handleSort = (column:string, state: any) => {
    if (state.column === column) {
      return this.setState( {
        ...state,
        data: state.data.slice().reverse(),
        direction:
          state.direction === 'ascending' ? 'descending' : 'ascending',
      });
    }

    this.setState({
      ...state,
      column: column,
      data: _.sortBy(state.data, [column]),
      direction: 'ascending',
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

  getVendor():string {
    let vendor = 'walmart';
    if((this.props as any).query['v']) {
      vendor = (this.props as any).query['v'] as string;
    }
    return vendor;
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
    axios.get('/api/vendors/'+this.getVendor()+'?' + this.buildQueryURL(state))
      .then((response) => {
        // handle success
        this.setState({
          ...state,
          aggregateResult: state.aggregate,
          errors,
          error: null,
          data: response.data
        });
      }).catch((error) => {
        this.setState({
          ...state,
          error: this.tryGetErrorMessage(error),
          data: []
      });
    });
  }

  parsePrice = (price) => {
    if(!price) {
      return 0;
    }
    return parseFloat(price.substring(1));
  }

  render = () => {
    const { column, data, direction, aggregateResult, errors, error } = this.state as any;

    let representation = (<p>{JSON.stringify(data, null, 2)}</p>);
    let chart:any = null;

    const vendorsComp = (this.props as any).vendors.map((v) => {
      return (<Link href={{
        pathname: '/data',
        search: `?v=${v}`,
      }} key={v}
      ><a onClick={() =>setTimeout(() =>this.handleReload(this.state), 200)}>{v}</a></Link>)
    });

    // If it is an array we can show a table
    if(data?.map && !aggregateResult) {
      representation =
        (<Table sortable celled fixed>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell
                sorted={column === 'name' ? direction : null}
                onClick={() => this.handleSort('name', this.state)}
              >
                Name
              </Table.HeaderCell>
              <Table.HeaderCell
                sorted={column === 'price' ? direction : null}
                onClick={() => this.handleSort('price', this.state)}
              >
                Price
              </Table.HeaderCell>
              <Table.HeaderCell
                sorted={column === 'pricePerUnit' ? direction : null}
                onClick={() => this.handleSort('pricePerUnit', this.state)}
              >
                Price Per Unit
              </Table.HeaderCell>
              <Table.HeaderCell
                sorted={column === 'location' ? direction : null}
                onClick={() => this.handleSort('location', this.state)}
              >
                Location
              </Table.HeaderCell>
              <Table.HeaderCell
                sorted={column === 'dateTime' ? direction : null}
                onClick={() => this.handleSort('dateTime', this.state)}
              >
                Date/Time
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data && data.map(({ _id, name, price, pricePerUnit, location, dateTime  }) => (
              <Table.Row key={_id}>
                <Table.Cell>{name}</Table.Cell>
                <Table.Cell>{price}</Table.Cell>
                <Table.Cell>{pricePerUnit}</Table.Cell>
                <Table.Cell>Long:{location?.longitude} Lat:{location?.latitude}</Table.Cell>
                <Table.Cell>{dateTime}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>);
      let categories = {};
      data.forEach((item) => {
        if(!item.dateTime) {
          return;
        }
        if(!categories[item.name]) {
          categories[item.name] = [];
        }
        categories[item.name].push({x: new Date(item.dateTime), y: this.parsePrice(item.price) })
      });

      const series = _.map(categories, (value, key) => {
        return (
          <LineSeries
            data={value}/>
        )
      });

      const legends = _.map(categories, (value, key) => {
        return {
          title: key,
          disabled: false,
          data: value
        }
      });

      chart = (
        <div>
          <DiscreteColorLegend
            width={180}
            items={legends}
          />
          <XYPlot
          xType="time"
          width={300}
          height={300}>
          <HorizontalGridLines />
          {series}
          <XAxis />
          <YAxis />
        </XYPlot>
        </div>);
    }

    return (
      <div className={styles.container}>
        <Head>
          <title>Untitled Inflation Calculation Group Dashboard - DATA</title>
        </Head>
        <p>Vendor:{this.getVendor()}</p>
        {vendorsComp}
        <p><a href="https://docs.mongodb.com/manual/reference/method/db.collection.find/" target="_blank" rel="noreferrer">Find</a> example: <pre>&#123;&quot;price&quot;: &quot;$2.99&quot;&#125;</pre></p>
        <span className={styles.error}>{errors && errors["find"]}</span>
        <textarea name='find' onChange={this.handleChange}>{}</textarea>
        <p>Sort example:<br/><pre>&#123;&quot;dateTime&quot;:1&#125;</pre></p>
        <span className={styles.error}>{errors && errors["sort"]}</span>
        <textarea name='sort' onChange={this.handleChange}>{}</textarea>
        <p><a href="https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/" target="_blank" rel="noreferrer">Aggregate</a> example: <pre>[&#123;&quot;$group&quot;:&#123;&quot;_id&quot;:&quot;name&quot;,&quot;count&quot;:&#123;&quot;$sum&quot;:1&#125;&#125;&#125;]</pre></p>
        <span className={styles.error}>{errors && errors["aggregate"]}</span>
        <textarea name='aggregate' onChange={this.handleChange}></textarea>
        <span className={styles.error}>{error}</span>
        <button onClick={() =>this.handleReload(this.state)}>Reload</button>
        {representation}
        {chart}
      </div>
    )
  }
}

export default Data