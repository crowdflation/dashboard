import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import { Table } from 'semantic-ui-react'
import _ from 'lodash'
import axios from 'axios'
import { connectToDatabase } from "../lib/util/mongodb"
import {getUnlabelled} from "./api/unlabelled";

import categories from "../data/categories";
import Select from "@material-ui/core/Select";
import MenuItem from "@mui/material/MenuItem";

function flatten(out, prepend, branch) {
  if(!branch?.children?.length) {
    out.push(`${prepend}>${branch.label}`);
  } else {
    branch.children.forEach((br)=> {
      flatten(out, branch.label==='All items'?'':`${prepend}>${br.label}`, br);
    });
  }
  return out;
}

export async function getServerSideProps({query}) {
  const {db} = await connectToDatabase();
  let flatCategories =  [];
  flatCategories = flatten(flatCategories, '', categories);

  let vendors = await db.collection('_vendors').find().toArray();
  let countries = {};
  vendors.map(v => countries[v.country]=true);
  vendors = vendors.map(v => v.name);
  vendors = _.union(vendors, ['walmart', 'kroger', 'zillow']);
  const vendor = vendors[0];
  const language = 'EN';
  const country = 'US';
  const languages = ['EN', 'TR'];

  const unlabelled = await getUnlabelled(country, language, vendor);
  return {
    props: {vendors, query, unlabelled, flatCategories, countries:Object.keys(countries), country, language, vendor, languages}, // will be passed to the page component as props
  }
}

class Unlabelled extends Component {

  flatCategories;
  vendors;
  languages;
  countries;
  constructor(props: any) {
    super(props);
    this.state = {
      column: null,
      data: props.unlabelled.map((u)=>({name: u, selected: false})),
      direction: null,
      category: null,
      errors: null,
      country: props.country,
      language: props.language,
      vendor: props.vendor,
      //TODO: Fix to be opposite
      allChecked: true
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleReload(this.state);
    this.flatCategories = props.flatCategories;
    this.vendors = props.vendors;
    this.languages = props.languages;
    this.countries = props.countries;
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
    return ['country', 'limit'].reduce((str, key) => {
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
        errors[key] = (e as any).toString();
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
    this.loadData(state, errors);
  }


  private loadData(state, errors: any) {
    // Make a request for a user with a given ID
    axios.get('/api/uncategorised?' + this.buildQueryURL(state))
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

  selectChange = (event) => {
    const value = event.target.value;
    this.setState({...this.state, [event.target.name]:value});
  }

  showError = (error) => {
    this.setState({...this.state, error});
  }

  handleSave = (state) => {
    const { data, search, wallet, language, category, country } = this.state as any;
    const that = this;

    if(!wallet) {
      return that.showError('Please add wallet value');
    }

    if(!language) {
      return that.showError('Please select a language');
    }

    if(!category) {
      return that.showError('Please select a category');
    }

    if(!country) {
      return that.showError('Please select a country');
    }

    const items = this.filter().filter((i) => i.selected).map((({ name, selected }) => ({
      name,
      selected,
      wallet,
      language,
      category,
      country
    })));

    if(!items.length) {
      return that.showError('Please select an item to assign a category');
    }

    axios.post('/api/unlabelled', items)
        .then(() => {
          const newData = data.filter(({selected})=>!selected);
          this.setState({
            ...this.state,
            data: newData
          });

          that.loadData(state, []);
        }).catch((error) => {
      this.setState({
        ...this.state,
        success: null,
        error: this.tryGetErrorMessage(error),
      });
    });
  }

  private filter() {
    const { data, search } = this.state as any;
    return data?.filter((i) => !search || _.includes(i?.name?.toLowerCase(), search?.toLowerCase()))
  }

  changeSelected = (itemName, selected) => {
    const { data } = this.state as any;
    const item = this.filter().find(({name})=>name==itemName);
    item.selected = selected;
    this.setState({
      ...this.state,
      data: data.slice()
    });
  }

  changeSelectAll= () => {
    const { data } = this.state as any;
    const filtered = this.filter();
    const find = filtered.find((i) => i.selected);
    if(find) {
      filtered.forEach((i)=>i.selected = false);
    } else {
      filtered.forEach((i)=>i.selected = true);
    }
    this.setState({
      ...this.state,
      allChecked: !!find,
      data: data.slice()
    });
  }

  render = () => {
    const { column, data, direction, allChecked, search, error, country, language, vendor, category } = this.state as any;
    const that = this;
    const items = this.filter();

    return (
      <div className={styles.container}>
        <h1>Data Labeling</h1>
        <span>This page allows labelling data. People who label data would be rewarded to their wallet when their labels are used.</span>
        <p>Vendor:</p>
        <Select
            label="Vendor"
            className={styles["MuiSelect-select"]}
            name='vendor'
            onChange={that.selectChange.bind(that)}
            defaultValue={vendor}
        >
          {that.vendors.map((c)=>(<MenuItem value={c}>{c}</MenuItem>))}
        </Select>
        <p>Language:</p>
        <Select
            label="Language"
            name='language'
            className={styles["MuiSelect-select"]}
            onChange={that.selectChange.bind(that)}
            defaultValue={language}
        >
          {that.languages.map((c)=>(<MenuItem value={c}>{c}</MenuItem>))}
        </Select>
        <p>Country:</p>
        <Select
            label="Country"
            name='country'
            className={styles["MuiSelect-select"]}
            onChange={that.selectChange.bind(that)}
            defaultValue={country}
        >
          {that.countries.map((c)=>(<MenuItem value={c}>{c}</MenuItem>))}
        </Select>
        <p>Category:</p>
        <Select
            label="Category"
            name='category'
            className={styles["MuiSelect-select"]}
            onChange={that.selectChange.bind(that)}
            defaultValue={category}
        >
          {that.flatCategories.map((c)=>(<MenuItem value={c}>{c}</MenuItem>))}
        </Select>

        <p>Wallet:</p>
        <input name='wallet' onChange={this.handleChange}/>
        <span className={styles.error}>{error && error}</span>
        <button onClick={() =>this.handleSave(this.state)}>Save</button>
        <Table sortable celled fixed>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell
                sorted={column === 'name' ? direction : null}
            >
              <span onClick={() => this.handleSort('name', this.state)}>Name <span>(Search)</span></span> {' '}
              <input name='search' onChange={this.handleChange}/>
            </Table.HeaderCell>
            <Table.HeaderCell
                sorted={column === 'selected' ? direction : null}
            >
              <span onClick={() => this.handleSort('selected', this.state)}>Select{' '}</span>
              <input type='checkbox' checked={!allChecked} onChange={()=>{that.changeSelectAll()}} />
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map(({ name, selected  }) => (
              <Table.Row key={name}>
                <Table.Cell>{name}</Table.Cell>
                <Table.Cell><input type='checkbox' checked={selected} onChange={()=>{that.changeSelected(name, !selected)}} /></Table.Cell>
              </Table.Row>
          ))}
          {(!items?.length)?'No Items Found':null}
        </Table.Body>
      </Table>
      </div>
    )
  }
}

export default Unlabelled