import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import { Table } from 'semantic-ui-react'
import _ from 'lodash'
import axios from 'axios'
import {XYPlot, XAxis, YAxis, HorizontalGridLines, LineSeries, DiscreteColorLegend} from 'react-vis'
import { calculateCategoriesCount } from './api/categories'


export async function getServerSideProps({query}) {
  let categoriesCount = await calculateCategoriesCount();
  return {
    props: {categoriesCount, query}, // will be passed to the page component as props
  }
}

function transformData(categoriesCount) {
  return _.map(categoriesCount, (item, key) => {
    return {category: key, count: item };
  });
}

class Categories extends Component {

  constructor(props: any) {
    super(props);
    this.state = {
      column: null,
      data: transformData(props.categoriesCount),
      direction: null,
      errors: null,
    };

    this.handleChange = this.handleChange.bind(this);
    //this.handleReload(this.state);
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
    axios.get('/api/categories')
      .then((response) => {
        // handle success
        this.setState({
          ...state,
          errors,
          error: null,
          data: transformData(response.data.categoriesCount)
        });
      }).catch((error) => {
        this.setState({
          ...state,
          error: this.tryGetErrorMessage(error),
          data: []
      });
    });
  }

  render = () => {
    const { column, data, direction, errors, error } = this.state as any;
    const table = (<Table sortable celled fixed>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell
                sorted={column === 'category' ? direction : null}
                onClick={() => this.handleSort('category', this.state)}
              >
                Category
              </Table.HeaderCell>
              <Table.HeaderCell
                sorted={column === 'count' ? direction : null}
                onClick={() => this.handleSort('count', this.state)}
              >
                Count
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data && data.map(({ category, count  }) => (
              <Table.Row key={category}>
                <Table.Cell>{category}</Table.Cell>
                <Table.Cell>{count}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>);
    return (
      <div className={styles.container}>
        {table}
      </div>
    )
  }
}

export default Categories