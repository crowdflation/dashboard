import Head from 'next/head'
import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import { Table } from 'semantic-ui-react'
import _ from 'lodash'
import axios from 'axios'

class Data extends Component {

  dispatch: any;

  constructor(props) {
    super(props);
    this.state = {
      column: null,
      data: [],
      direction: null,
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleReload(this.state);
  }

  handleChange = (e: any) => {
    this.setState({[e.target.name]: e.target.value});
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
      if(str!=='') {
        str +='&';
      }
      str += key + '=' + encodeURIComponent(JSON.stringify(state[key]));
      return str;
    }, '');
  }

  handleReload = (state) => {
    // Make a request for a user with a given ID
    axios.get('/api/walmart?' + this.buildQueryURL(state))
      .then((response) => {
        // handle success
        this.setState({
          ...state,
          data: response.data
        });
      });
  }

  render = () => {
    const { column, data, direction } = this.state as any;
    return (
      <div className={styles.container}>
        <Head>
          <title>Untitled Inflation Calculation Group Dashboard - DATA</title>
        </Head>

        {/*

        <p>Find:</p>
        <textarea name='find' onChange={this.handleChange}></textarea>
        <p>Sort:</p>
        <textarea name='sort' onChange={this.handleChange}></textarea>
        <p>Aggregate:</p>
        <textarea name='aggregate' onChange={this.handleChange}></textarea>

        */}
        <button onClick={() =>this.handleReload(this.state)}>Reload</button>
        <Table sortable celled fixed>
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
            {data.map(({ _id, name, price, pricePerUnit, location, dateTime  }) => (
              <Table.Row key={_id}>
                <Table.Cell>{name}</Table.Cell>
                <Table.Cell>{price}</Table.Cell>
                <Table.Cell>{pricePerUnit}</Table.Cell>
                <Table.Cell>{location}</Table.Cell>
                <Table.Cell>{dateTime}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    )
  }
}

export default Data