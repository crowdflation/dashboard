import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import 'semantic-ui-css/components/table.min.css'
import 'semantic-ui-css/components/icon.min.css'
import { Table } from 'semantic-ui-react'
import _ from 'lodash'
import { calculateCategoriesCount } from './api/categories'
import Link from "next/link";


export async function getServerSideProps({query}) {
  const categoriesCount = await calculateCategoriesCount(false);
  return {
    props: {categoriesCount, query}, // will be passed to the page component as props
  }
}

function transformData(categoriesCount) {
  return _.map(categoriesCount, (item, key) => {
    return {category: key, count: item.count, vendors: item.vendors };
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

  timeSince= (date) => {

    // @ts-ignore
    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = seconds / 31536000;

    if (interval > 1) {
      return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minutes";
    }
    return Math.floor(seconds) + " seconds";
  }


  render = () => {
    const { column, data, direction } = this.state as any;
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
              <Table.HeaderCell>
                Vendors
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data && data.map(({ category, count, vendors  }) => (
              <Table.Row key={category}>
                <Table.Cell>{(category=='Unknown')?(<Link href="unlabelled" target="_blank">Unknown</Link>):category}</Table.Cell>
                <Table.Cell>{count}</Table.Cell>
                <Table.Cell>{_.map(vendors, (val, key)=> { return (<p>{`${key}:${val.count}, ${this.timeSince(val.dateTime)} ago`}</p>)})}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>);
    return (
      <div className={styles.container}>
        <h2>This page shows data categories that had uploads within 24 hours:</h2>
        {table}
      </div>
    )
  }
}

export default Categories