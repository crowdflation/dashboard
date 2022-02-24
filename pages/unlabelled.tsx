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
import {Box, CircularProgress} from "@mui/material";

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

  const unlabelled = await getUnlabelled(country, language, vendor, null);
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
      category: undefined,
      errors: {category: 'Please choose a category', wallet: 'Please enter a wallet address'},
      country: props.country,
      language: props.language,
      vendor: props.vendor,
      //TODO: Fix to be opposite
      allChecked: true
    };

    this.handleChange = this.handleChange.bind(this);
    this.flatCategories = props.flatCategories;
    this.vendors = props.vendors;
    this.languages = props.languages;
    this.countries = props.countries;
  }

  handleChange = (e: any) => {
    const that = this;
    const newState = {
      ...this.state,
      [e.target.name]: e.target.value
    };
    const { wallet, language, category, country } = newState as any;
    const errors = this.checkErrors(wallet, that, language, category, country);
    this.setState({
      ...newState,
      errors
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
    return ['vendor', 'country', 'limit', 'language', 'search'].reduce((str, key) => {
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
      return error.toString() || 'Unknown error';
    }
  }

  getVendor():string {
    let vendor = 'walmart';
    if((this.props as any).query['v']) {
      vendor = (this.props as any).query['v'] as string;
    }
    return vendor;
  }

  private loadData(state, errors: any) {
    // Make a request for a user with a given ID
    axios.get('/api/unlabelled?' + this.buildQueryURL(state))
        .then((response) => {
          // handle success
          this.setState({
            ...state,
            aggregateResult: state.aggregate,
            errors,
            error: null,
            inProgress: false,
            data: response.data.map((u)=>({name: u, selected: false}))
          });
        }).catch((error) => {
      this.setState({
        ...state,
        error: this.tryGetErrorMessage(error),
        inProgress: false,
        data: []
      });
    });
  }

  selectChange = (event) => {
    const value = event.target.value;
    const that = this;
    const newState = {
      ...this.state,
      [event.target.name]:value
    };
    const { wallet, language, category, country } = newState as any;
    const errors = this.checkErrors(wallet, that, language, category, country);
    this.setState({
      ...newState,
      errors
    });
  }

  showError = (error) => {
    this.setState({...this.state, error});
  }

  handleSave = (state) => {
    const { data, search, wallet, language, category, country } = this.state as any;
    const that = this;
    let errors = this.checkErrors(wallet, that, language, category, country);

    this.setState({
      ...this.state,
      error: errors[Object.keys(errors)[0]],
      errors
    });

    if(!_.isEmpty(errors)) {
      return;
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

  private checkErrors(wallet, that: this, language, category, country) {
    let errors: any = {};

    if (!wallet) {
      errors.wallet = 'Please enter a wallet address';
    }

    if (!language) {
      errors.wallet = 'Please select a language';
    }

    if (!category) {
      errors.category = 'Please select a category';
    }

    if (!country) {
      errors.country = 'Please select a category';
    }

    return errors;
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

  timeout
  handleSearch = (e) => {
    const that = this;
    clearTimeout(that.timeout);
    const newState = {
      ...this.state,
      [e.target.name]: e.target.value,
      inProgress: true
    };
    const { wallet, language, category, country } = newState as any;
    const errors = this.checkErrors(wallet, that, language, category, country);
    this.setState({
      ...newState,
      errors
    });

    const timeout = setTimeout(()=> {
      if(timeout!==that.timeout) {
        return;
      }
      that.loadData(that.state,  (that.state as any).errors);
    }, 500);
    that.timeout = timeout;
  }

  render = () => {
    const { column, direction, allChecked, error, errors, country, language, vendor, category, inProgress } = this.state as any;
    const that = this;
    const items = this.filter();
    const boxStyle = {display: 'flex', 'align-items': 'center', justifyContent: 'center'};

    return (
      <div className={[styles.container, styles.labelling].join(' ')}>
        <h1>Data Labeling</h1>
        <span>This page allows labelling data. People who label data would be rewarded to their wallet when their labels are used.</span>
        <h5>Vendor:</h5>
        <Select
            label="Vendor"
            className={styles.smallDropdowns}
            name='vendor'
            onChange={(e)=> {(that.state as any).data = []; (that.state as any).inProgress = true; that.selectChange(e); that.loadData(that.state, [])}}
            defaultValue={vendor}
        >
          {that.vendors.map((c)=>(<MenuItem key={c} value={c}>{c}</MenuItem>))}
        </Select>
        <span className={styles.error}>{errors['language']}</span>
        <h5>Language:</h5>
        <Select
            label="Language"
            name='language'
            className={styles.smallDropdowns}
            onChange={(e)=> {that.selectChange(e); that.loadData(that.state, [])}}
            defaultValue={language}
        >
          {that.languages.map((c)=>(<MenuItem key={c} value={c}>{c}</MenuItem>))}
        </Select>
        <span className={styles.error}>{errors['country']}</span>
        <h5>Country:</h5>
        <Select
            label="Country"
            name='country'
            className={styles.smallDropdowns}
            onChange={that.selectChange.bind(that)}
            defaultValue={country}
        >
          {that.countries.map((c)=>(<MenuItem key={c} value={c}>{c}</MenuItem>))}
        </Select>
        <h5>Category:</h5>
        <span className={styles.error}>{errors['category']}</span>
        <Select
            label="Category"
            name='category'
            className={styles.smallDropdowns}
            onChange={that.selectChange.bind(that)}
            defaultValue={category}
        >
          {that.flatCategories.map((c)=>(<MenuItem key={c} value={c}>{c}</MenuItem>))}
          <MenuItem key={'undefined'} value={undefined}></MenuItem>
        </Select>
        <span className={styles.error}>{errors['wallet']}</span>
        <h5>Wallet:</h5>
        <input name='wallet' onChange={this.handleChange}/>
        <span className={styles.error}>{error && error}</span>
        <button onClick={() =>this.handleSave(this.state)}>Save</button>
        <Table sortable celled fixed>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell
                sorted={column === 'name' ? direction : null}
            >
              <span onClick={() => this.handleSort('name', this.state)}>Name <span>(Search-Case Sensitive)</span></span> {' '}
              <input name='search'  placeholder={' Fish [supports regex]'} onChange={(e)=> {that.handleSearch(e)}}/>
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
          {inProgress ? (<Box style={boxStyle}><CircularProgress/></Box>) : null}
          {(!items?.length && !inProgress)?'No Items Found':null}
          {inProgress?'Loading': null}
          {items.map(({ name, selected  }) => (
              <Table.Row key={name}>
                <Table.Cell>{name}</Table.Cell>
                <Table.Cell><input type='checkbox' checked={selected} onChange={()=>{that.changeSelected(name, !selected)}} /></Table.Cell>
              </Table.Row>
          ))}

        </Table.Body>
      </Table>
      </div>
    )
  }
}

export default Unlabelled