import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import { Table } from 'semantic-ui-react'
import _ from 'lodash'
import axios from 'axios'
import { getProducts } from "./api/products";
import Geocode from "react-geocode";
import Autocomplete from '@mui/material/Autocomplete';
import {
  Box,
  CircularProgress,
  Link,
  Menu,
  MenuItem,
  TextField
} from "@mui/material";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationCrosshairs, faCircleChevronDown } from '@fortawesome/free-solid-svg-icons';
import { DialogComponent } from '../components/dialog-component';
import Select from "@material-ui/core/Select";
import {codeToCountryMap} from "../data/countries";
import DropdownTreeSelect from "react-dropdown-tree-select17";
import categories from "../data/categories";
import 'react-dropdown-tree-select17/dist/styles.css';
import {connectToDatabase, getVendors} from "../lib/util/mongodb";
import {cleanupPriceName} from "../lib/util/utils";

enum Parameters {
  Category = "category",
  Country = "country",
  Location = "location",
  Distance = "distance",
  Vendor = "vendor",
  Currency= "currency"
}


export async function getServerSideProps({query}) {
  const {category, country, vendor} = query;
  const data = await getProducts(category, country, undefined, undefined, vendor, undefined);
  const apiKey: string = (process.env as any).GOOGLE_MAPS_API_KEY as string;

  const {db} = await connectToDatabase();

  const vendorObjects = (await getVendors(db)).map(v=> { return {...v, _id:v._id.toString()} });
  const vendors = vendorObjects.map(v => v.name);

  return {
    props: {data, category: category?category:null, country: country?country:null, apiKey, vendors}, // will be passed to the page component as props
  }
}

class Data extends Component {

  constructor(props: any) {
    super(props);
    const tags:string[] = [];
    if(props.category) {
      tags.push('category:' + (props.category as string));
    }
    if(props.country) {
      tags.push('country:' + (props.country as string));
    }

    this.state = {
      column: null,
      data: props.data,
      direction: null,
      errors: null,
      search: '',
      searchValues:[...tags],
      tagOptions: ['category:'+ (props.category as string),'country:'+(props.country as string), 'location:', 'distance:','vendor:', 'currency:'].map((o)=>{ return {label:o};}),
      tags,
      dialogContents: null,
      dialogLabel:'',
      vendors: props.vendors
    };

    this.newState = this.state;

    Geocode.setApiKey(props.apiKey);

    // set response language. Defaults to english.
    Geocode.setLanguage("en");
  }

  handleSort = (column:string, state: any) => {
    if (state.column === column) {
      return this.updateState( {
        data: state.data.slice().reverse(),
        direction:
          state.direction === 'ascending' ? 'descending' : 'ascending',
      });
    }

    this.updateState({
      column: column,
      data: _.sortBy(state.data, [column]),
      direction: 'ascending',
    });
  }

  newState={};

  updateState = (newValues) => {
    this.newState = {
      ...this.state,
      ...this.newState,
      ...newValues
    }
    this.setState(this.newState);
  }

  setTags = (searchValues, tagOptions = undefined)  => {
    let newState: any = {
      searchValues: searchValues.filter(o=>!!o)
    };
    if(tagOptions) {
      newState = {
        searchValues: searchValues.filter(o=>!!o),
        tagOptions
      };
    }


    Object.values(Parameters).map((tag)=> {
      if(!searchValues.find((s) => {
        return !_.startsWith(s, tag +':');
      })) {
        console.log('clearing', tag);
        newState[tag] = null;
      }
    });
    this.updateState(newState);
    return newState;
  }

  showDialog =(type:Parameters) => {
    const that = this;
    const vendors = (this.state as any).vendors;
    return new Promise((succ, fail) => {
      const result:any = {};

      let dialogContents:any = null;
      let dialogLabel: string|null= null;

      const countrySelectChange = (event) => {
        const country = event.target.value;
        result['country'] = country;
      };


      const vendorSelectChange = (event) => {
        const vendor = event.target.value;
        result['vendor'] = vendor;
      };

      const distanceSelectChange = (event) => {
        const distance = event.target.value;
        result['distance'] = distance;
      };

      const categoryChange = (currentNode, selectedNodes) => {
        console.log('onChange::', currentNode, selectedNodes);
        let category = null;
        _.map(selectedNodes, (item: any) => {
          if(item === currentNode) {
            category = item.label;
          }
          result['category'] = category;
        });
      };


      const dialogCallback = (response) => {
        that.updateState({
          dialogContents: null
        });
        if(response) {
          console.log('success', result);
          succ(result);
        } else {
          fail();
        }
      };

      const countries = ['US', 'TR', 'GB'];

      const distances = [1000, 3000, 5000, 10000, 20000, 30000, 50000];

      const distanceNames = {};

      distances.forEach((d)=> {
        distanceNames[d] = `${d / 1000} km ${(d/1600).toFixed(1)} miles`;
      });

      switch(type) {
        case Parameters.Category:
          console.log('categories', categories);
          dialogContents = (<DropdownTreeSelect data={categories} onChange={categoryChange.bind(that)} />);
          dialogLabel='Please choose a category';
          break;
        case Parameters.Country:
          dialogContents = (<Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              label="Country"
              defaultValue='US'
              className={styles["MuiSelect-select"]}
              onChange={countrySelectChange}
          >
            {countries.map((c)=>(<MenuItem key={c} value={c}>{codeToCountryMap[c].name}</MenuItem>))}
          </Select>);
          dialogLabel='Please choose a country';
          break;
        case Parameters.Vendor:
          dialogContents = (<Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              label="Country"
              defaultValue='US'
              className={styles["MuiSelect-select"]}
              onChange={vendorSelectChange}
          >
            {vendors.map((c)=>(<MenuItem key={c} value={c}>{c}</MenuItem>))}
          </Select>);
          dialogLabel='Please choose a vendor';
          break;
        case Parameters.Distance:
          dialogContents = (<Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              label="Country"
              defaultValue='US'
              className={styles["MuiSelect-select"]}
              onChange={distanceSelectChange}
          >
            {distances.map((c)=>(<MenuItem key={c} value={c}>{distanceNames[c]}</MenuItem>))}
          </Select>);
          dialogLabel='Please choose distance maximum';
          break;
      }

      that.updateState({
        dialogContents,
        dialogCallback,
        dialogLabel
      });
    });
  }

  findValue = (state, key): string | undefined => {
    return state[key];
  }

  buildQueryURL = () => {
    const state = this.state;

    return ['category','country', 'longitude', 'latitude','distance','vendor', 'currency'].reduce((str, key) => {
      const val = this.findValue(state, key);
      if(!val) {
        return str;
      }
      if(str!=='') {
        str +='&';
      }
      str += key + '=' + encodeURIComponent(val);
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

  reloadData = () => {
    // Make a request for a user with a given ID
    axios.get('/api/products?' + this.buildQueryURL())
      .then((response) => {
        // handle success
        this.updateState({
          error: null,
          data: response?.data
        });
      }).catch((error) => {
        this.updateState({
          error: this.tryGetErrorMessage(error),
          data: []
      });
    });
  }

  getLocation() {
    const state = this.state;
    (state as any).anchorEl = null;
    this.updateState({ inProgress: true, anchorEl: null});

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position)=> {
        console.log('position',position);
        if(position) {
          const {latitude,longitude} = position.coords;

          Geocode.fromLatLng(position.coords.latitude, position.coords.longitude).then(
              (response) => {
                const result = response.results[0];

                const postCode = result.address_components.find((p)=> {
                  return p.types.find((t)=> {
                    return t==='postal_code';
                  });
                });

                const address = postCode?.short_name || result.formatted_address;

                console.log('address',address, response.results[0]);
                this.updateState({
                  location: {
                    latitude,
                    longitude,
                    address
                  },
                  inProgress: false
                });
                this.setLocation( address);
              },
              (error) => {
                console.log('address error',error);
                const address = latitude + ' ' + longitude;
                this.updateState({
                  location: {
                    latitude,
                    longitude,
                    address: latitude + ' ' + longitude
                  },
                  inProgress: false
                });
                this.setLocation(address);
              }
          );
        } else {
          this.updateState({
            address: 'Location not found',
            locationNotSupported: true
          });
        }
      });
    }
  }

  updateTag = ( tag, value) => {
    let { searchValues } = this.state as any;

    searchValues = searchValues.filter((s) => {
      return !_.startsWith(s, tag +':');
    });

    searchValues.push(tag +':' + value);

    this.updateState({searchValues, [tag]:value});
    this.reloadData();
  }

  setLocation = ( address) => {
    let { searchValues, tagOptions } = this.state as any;

    searchValues = searchValues.filter((s) => {
      return !_.startsWith(s, 'location:');
    });

    searchValues.push('location:' + address);

    tagOptions = tagOptions.filter((s) => {
      return !_.startsWith(s.label, 'location:');
    });

    tagOptions.push({label:'location:' + address});
    this.setTags(searchValues, tagOptions);
  }

  onChangeTagsInputValue = (event, value, reason) => {
    this.setTags([...value]);
    setTimeout(()=> {
      this.reloadData();
    }, 1);
  }

  onChangeSearchInputValue = (event: React.SyntheticEvent, value: string, reason: string) => {

    const parameters = ['location:', 'category:','country:'];
    if(parameters.find((p)=> _.startsWith(value, p) || _.startsWith(p, value))) {
      // ignore parameter input
      return this.updateState({
        search: ''
      });
    }

    this.updateState({
      search: value
    });
  }

  parsePrice = (price) => {
    if(!price) {
      return 0;
    }
    return parseFloat(price.substring(1));
  }

  handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    this.updateState({
      anchorEl: event.currentTarget
    });
  };
  handleClose = () => {
    this.updateState({
      anchorEl: null
    });
  };

  handleClear = () => {
    this.updateState({
      anchorEl: null,
      searchValues: []
    });
  };

  handleAdd = async (what:Parameters) => {

    this.updateState({
      anchorEl: null
    })

    switch (what) {
      case Parameters.Location:
        this.getLocation();
        break;
      case Parameters.Country:
        const {country} = (await this.showDialog(what)) as any;
        if(country) {
          this.updateTag(what, country.toLowerCase());
        }
        break;

      case Parameters.Category:
      case Parameters.Distance:
      case Parameters.Vendor:
        const data = (await this.showDialog(what)) as any;
        const value = data[what];
        if(value) {
          this.updateTag(what, value);
        }
        break;
    }

  };

  render = () => {
    const { dialogContents, dialogCallback, dialogLabel, column, data, direction, search, searchValues, error, location, tags, tagOptions, inProgress, anchorEl } = this.state as any;
    console.log('dialogContents', dialogContents);

    let representation = (<p>{JSON.stringify(data, null, 2)}</p>);


    const filteredData = data.filter((d)=> {
      if(!_.trim(search)) {
        return true;
      }
      return _.includes(d.name?.toLowerCase(), search?.toLowerCase());

    });

    console.log('filteredData', filteredData, data);

    // If it is an array we can show a table
    if(data?.map) {
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
                sorted={column === 'vendor' ? direction : null}
                onClick={() => this.handleSort('vendor', this.state)}
              >
                Vendor
              </Table.HeaderCell>
              <Table.HeaderCell
                sorted={column === 'distance' ? direction : null}
                onClick={() => this.handleSort('distance', this.state)}
              >
                Location
              </Table.HeaderCell>
              <Table.HeaderCell
                sorted={column === 'dateTime' ? direction : null}
                onClick={() => this.handleSort('dateTime', this.state)}
              >
                Last Date/Time
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredData && filteredData.map(({ _id, name, price, vendor, distance, dateTime  }) => (
              <Table.Row key={_id}>
                <Table.Cell>{name}</Table.Cell>
                <Table.Cell>{cleanupPriceName(price)}</Table.Cell>
                <Table.Cell>{vendor}</Table.Cell>
                <Table.Cell>{distance}</Table.Cell>
                <Table.Cell>{new Date(dateTime).toLocaleString()}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>);
    }

    const boxStyle = {display: 'flex', 'align-items': 'center', justifyContent: 'center'};


    return (
      <div className={styles.container}>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
          <Link onClick={() =>this.getLocation()}><FontAwesomeIcon icon={faLocationCrosshairs} size="3x" color="silver"/></Link>
          <Link onClick={(e) =>this.handleClick(e)}><FontAwesomeIcon icon={faCircleChevronDown}  size="3x" color="silver"/></Link>
          <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              onClose={this.handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
           open={!!anchorEl}>
            <MenuItem onClick={this.handleClear}>Clear All</MenuItem>
            <MenuItem onClick={this.handleClose}>Add:</MenuItem>
            <MenuItem onClick={()=>this.handleAdd(Parameters.Location)}>Location</MenuItem>
            <MenuItem onClick={()=>this.handleAdd(Parameters.Country)}>Country</MenuItem>
            <MenuItem onClick={()=>this.handleAdd(Parameters.Category)}>Category</MenuItem>
            <MenuItem onClick={()=>this.handleAdd(Parameters.Distance)}>Distance</MenuItem>
            <MenuItem onClick={()=>this.handleAdd(Parameters.Vendor)}>Vendor</MenuItem>
          </Menu>
        </Box>
        {inProgress ? (<Box style={boxStyle}><CircularProgress/></Box>) : null}
        <Autocomplete
            sx={{ width: 1 }}
            style={{ margin: "10px 0" }}
            multiple
            id="tags-outlined"
            options={tagOptions}
            defaultValue={[...tags]}
            freeSolo
            value={[...searchValues]}
            onInputChange={(event: React.SyntheticEvent, value: string, reason: string)=>this.onChangeSearchInputValue(event, value, reason)}
            onChange={(e, value, reason) => this.onChangeTagsInputValue(e, value, reason)}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Search"
                    placeholder="Type search parameters or use plus button to add filters"
                    value={tags}
                />
            )}
        />;
        <span className={styles.error}>{error}</span>
        {representation}
        <DialogComponent label={dialogLabel} show={!!dialogContents} onResult={dialogCallback}>{dialogContents}</DialogComponent>
      </div>
    )
  }
}

export default Data