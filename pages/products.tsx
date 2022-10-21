import styles from '../styles/Home.module.css'
import React, { Component } from 'react'
import 'semantic-ui-css/components/table.min.css'
import 'semantic-ui-css/components/icon.min.css'
import { Table } from 'semantic-ui-react'
import _ from 'lodash'
import axios from 'axios'
import {getProducts} from "./api/products";
import Geocode from "react-geocode";
import {
    Box,
    CircularProgress,
    Link,
    Menu,
    MenuItem, TextField
} from "@mui/material";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faLocationCrosshairs, faCircleChevronDown} from '@fortawesome/free-solid-svg-icons';
import {DialogComponent} from '@/components/dialog-component';
import Select from "@material-ui/core/Select";
import {codeToCountryMap} from "../data/countries";
import DropdownTreeSelect from "react-dropdown-tree-select";
import categories from "../data/categories";
import 'react-dropdown-tree-select/dist/styles.css';
import {connectToDatabase, createIndicesOnVendors, getVendors} from "../lib/util/mongodb";
import {cleanupPriceName, isValidPrice} from "../lib/util/utils";
import keywordExtractor from "keyword-extractor";
import geoip from 'geoip-lite';
import {getQueries} from "./api/queries";
import Autocomplete from '@mui/material/Autocomplete';
import reactStringReplace from 'react-string-replace';


enum Parameters {
    Category = "category",
    Country = "country",
    Location = "location",
    Distance = "distance",
    Vendor = "vendor",
    Currency = "currency",
    Age = "age"
}

const parameterDefaults = {}
Object.values(Parameters).forEach(p => parameterDefaults[p] = null);
parameterDefaults[Parameters.Age] = 24 * 31;

function extractKeywordsAndParams(search) {
    const searchText = search;
    const params = {};
    if (!search) {
        return {search: []};
    }
    Object.values(Parameters).map((p => {
        const regexp = new RegExp(`\\s*${p}\\:(\\w*)`, 'g')
        const matches = [...search.matchAll(regexp)];
        _.forEach(matches, (match) => {
            params[p] = match[1];
            search = search.replace(match[0], '');
        });
    }));

    let words = keywordExtractor.extract(search, {
        language: "english",
        remove_digits: false,
        return_changed_case: true,
        remove_duplicates: false,
    });


    const keywords: string[] = [];
    words.forEach((w: string) => {
        keywords.push(w);
    });

    return {
        ...params,
        searchText,
        search: keywords
    };
}

function makeNull(val) {
    if (val === undefined) {
        return null;
    }
    return val;
}

//TODO: load it from vendors
const countries = ['US', 'TR', 'GB'];

let startupCodeCheck = false;

export async function getServerSideProps({req, query}) {
    const {db} = await connectToDatabase();
    if (!startupCodeCheck) {
        startupCodeCheck = true;
        createIndicesOnVendors(db).then();
    }

    const forwarded = req.headers["x-forwarded-for"]
    const ip = forwarded ? forwarded.split(/, /)[0] : req.connection.remoteAddress
    const geo = geoip.lookup(ip);
    let geoCountry = makeNull(geo?.country?.toLowerCase());

    if (geoCountry && !countries.find(c => c.toLowerCase() === geoCountry)) {
        geoCountry = countries[0].toLowerCase();
    }

    const {
        category,
        country,
        vendor,
        search,
        age,
        searchText
    } = {...query, ...extractKeywordsAndParams(query.search)} as any;

    let {sortColumn, sortDirection} = query;

    if (!sortColumn) {
        sortColumn = 'priceValue';
    }

    if (!sortDirection) {
        sortDirection = 'ascending';
    }


    const ageInHours = parseInt(age) || undefined;
    const data = _.sortBy(await getProducts(category, country || geoCountry, undefined, undefined, vendor, search, searchText, ageInHours || parameterDefaults[Parameters.Age]), [function (o) {
        return o[(sortColumn || 'priceValue')]
    }]);

    const apiKey: string = (process.env as any).GOOGLE_MAPS_API_KEY as string;

    const vendorObjects = (await getVendors(db)).map(v => {
        return {...v, _id: v._id.toString()}
    });
    const vendors = vendorObjects.map(v => v.name);

    const queries = await getQueries(query);

    return {
        props: {
            data: data.map((d) => {
                return {...d, dateTimeSort: new Date(d.dateTime).getTime() / 1000};
            }),
            category: makeNull(category),
            country: makeNull(country) || geoCountry,
            apiKey,
            vendors,
            vendor: makeNull(vendor),
            age: makeNull(ageInHours) || parameterDefaults[Parameters.Age],
            search,
            searchText: searchText || '',
            queries,
            sortDirection,
            sortColumn
        }, // will be passed to the page component as props
    }
}

const distances = [1000, 3000, 5000, 10000, 20000, 30000, 50000];

class Data extends Component {
    newState = {};
    requestNumberQueries = 0;
    responseNumberQueries = 0
    requestNumber = 0;
    responseNumber = 0;
    timeout;

    constructor(props: any) {
        super(props);
        const tags: string[] = [];
        if (props.category) {
            tags.push('category:' + (props.category as string));
        }
        if (props.country) {
            tags.push('country:' + (props.country as string));
            parameterDefaults[Parameters.Country] = props.country as string;
        }

        if (props.vendor) {
            tags.push('vendor:' + (props.vendor as string))
        }

        if (props.age) {
            tags.push('age:' + (props.age as string))
        }

        this.state = {
            column: props.sortColumn,
            data: props.data,
            country: props.country,
            vendor: props.vendor,
            direction: props.sortDirection,
            errors: null,
            search: props.search,
            searchText: props.searchText,
            age: props.age,
            searchValues: [...tags],
            queries: props.queries,
            tagOptions: [
                //...this.makeAllCategories(),
                ...countries.map((c) => 'country:' + c.toLowerCase()),
                //...distances.map((d)=>'distance:'+d),
                ...props.vendors.map((v) => 'vendor:' + v)].map((o) => {
                return {label: o};
            }),
            tags,
            dialogContents: null,
            dialogLabel: '',
            vendors: props.vendors
        };

        this.newState = this.state;

        Geocode.setApiKey(props.apiKey);

        // set response language. Defaults to english.
        Geocode.setLanguage("en");
    }

    addAllCategories = (here, categories) => {
        here.push('category:' + categories.label);
        categories?.children.map((c) => this.addAllCategories(here, c));
    }

    handleSort = (column: string, state: any) => {
        if (state.column === column) {
            return this.updateState({
                data: state.data.slice().reverse(),
                direction:
                    state.direction === 'ascending' ? 'descending' : 'ascending',
            });
        }

        this.updateState({
            column: column,
            data: _.sortBy(state.data, [function (o) {
                return o[column]
            }]),
            direction: 'ascending',
        });
    }

    updateState = (newValues) => {
        this.newState = {
            ...this.state,
            ...this.newState,
            ...newValues
        }
        console.log('newState', this.newState);

        this.setState(this.newState);
    }

    setTags = (searchValues, tagOptions = undefined) => {
        let newState: any = {
            searchValues: searchValues.filter(o => !!o)
        };
        if (tagOptions) {
            newState = {
                searchValues: searchValues.filter(o => !!o),
                tagOptions
            };
        }


        Object.values(Parameters).map((tag) => {
            if (!searchValues.find((s) => {
                return !_.startsWith(s, tag + ':');
            })) {
                console.log('clearing', tag);
                newState[tag] = null;
            }
        });

        console.log('newState', newState);
        this.updateState(newState);
        return newState;
    }

    showDialog = (type: Parameters) => {
        const that = this;
        const vendors = (this.state as any).vendors;
        return new Promise((succ, fail) => {
            const result: any = {};

            let dialogContents: any = null;
            let dialogLabel: string | null = null;

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

            const ageSelectChange = (event) => {
                const age = event.target.value;
                result['age'] = age;
            };

            const categoryChange = (currentNode, selectedNodes) => {
                console.log('onChange::', currentNode, selectedNodes);
                let category = null;
                _.map(selectedNodes, (item: any) => {
                    if (item === currentNode) {
                        category = item.label;
                    }
                    result['category'] = category;
                });
            };


            const dialogCallback = (response) => {
                that.updateState({
                    dialogContents: null
                });
                if (response) {
                    console.log('success', result);
                    succ(result);
                } else {
                    fail();
                }
            };


            const distanceNames = {};

            distances.forEach((d) => {
                distanceNames[d] = `${d / 1000} km ${(d / 1600).toFixed(1)} miles`;
            });

            const ageNames = {
                [1]: 'One Hour',
                [24]: 'Day',
                [24 * 7]: 'Week',
                [24 * 31]: 'Month',
                [24 * 365]: 'Year'
            };

            switch (type) {
                case Parameters.Category:
                    dialogContents = (<DropdownTreeSelect data={categories} onChange={categoryChange.bind(that)}/>);
                    dialogLabel = 'Please choose a category';
                    break;
                case Parameters.Country:
                    dialogContents = (<Select
                        label="Country"
                        className={styles["MuiSelect-select"]}
                        onChange={countrySelectChange}
                    >
                        {countries.map((c) => (<MenuItem key={c} value={c}>{codeToCountryMap[c].name}</MenuItem>))}
                    </Select>);
                    dialogLabel = 'Please choose a country';
                    break;
                case Parameters.Vendor:
                    dialogContents = (<Select
                        label="Vendor"
                        className={styles["MuiSelect-select"]}
                        onChange={vendorSelectChange}
                    >
                        {vendors.map((c) => (<MenuItem key={c} value={c}>{c}</MenuItem>))}
                    </Select>);
                    dialogLabel = 'Please choose a vendor';
                    break;
                case Parameters.Distance:
                    dialogContents = (<Select
                        label="Distance"
                        className={styles["MuiSelect-select"]}
                        onChange={distanceSelectChange}
                    >
                        {distances.map((c) => (<MenuItem key={c} value={c}>{distanceNames[c]}</MenuItem>))}
                    </Select>);
                    dialogLabel = 'Please choose distance maximum';
                    break;

                case Parameters.Age:
                    dialogContents = (<Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        label="Age"
                        defaultValue='1'
                        className={styles["MuiSelect-select"]}
                        onChange={ageSelectChange}
                    >
                        {Object.keys(ageNames).map((c) => (<MenuItem key={c} value={c}>{ageNames[c]}</MenuItem>))}
                    </Select>);
                    dialogLabel = 'Please choose maximum data age';
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
        const state = this.newState;

        return ['category', 'country', 'longitude', 'latitude', 'distance', 'vendor', 'currency', 'search', 'age', 'searchText'].reduce((str, key) => {
            let val = this.findValue(state, key);
            if (!val) {
                return str;
            }
            if (str !== '') {
                str += '&';
            }
            if (key === 'search') {
                val = JSON.stringify(val);
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

    getVendor(): string {
        let vendor = 'walmart';
        if ((this.props as any).query['v']) {
            vendor = (this.props as any).query['v'] as string;
        }
        return vendor;
    }

    checkResponseOutdated(response, requestNumberField, responseNumberField) {
        const url = new URL(
            response.request.responseURL
        );
        const lastRequestReceived = parseInt(url.searchParams.get('requestNumberField') as string);
        if (lastRequestReceived < this[responseNumberField]) {
            //Ignore out of date responses
            return true;
        }

        this[responseNumberField] = lastRequestReceived;
        return false;
    }

    getQueriesRequest = async () => {
        const query = this.buildQueryURL();
        this.requestNumberQueries++;
        const response = await axios.get(`/api/queries?requestNumberQueries=${this.requestNumberQueries}&${query}`);

        if (this.checkResponseOutdated(response, 'requestNumberQueries', 'responseNumberQueries')) {
            return;
        }

        this.updateState({queries: JSON.parse(response?.data)});
    }

    reloadData = () => {
        // Make a request for a user with a given ID
        const {column, direction} = this.newState as any;
        const query = this.buildQueryURL();
        console.log('Reloading', query, this.newState);

        this.requestNumber++;

        // todo = use await
        axios.get(`/api/products?requestNumber=${this.requestNumber}&${query}`)
            .then((response) => {

                const url = new URL(
                    response.request.responseURL
                );
                const lastRequestReceived = parseInt(url.searchParams.get('requestNumber') as string);
                if (lastRequestReceived < this.responseNumber) {
                    //Ignore out of date responses
                    return;
                }

                this.responseNumber = lastRequestReceived;


                let sorted = _.sortBy(JSON.parse(response?.data), [function (o) {
                    return o[column]
                }]);
                if (direction !== 'ascending') {
                    sorted = sorted.reverse();
                }

                console.log('sorted, ', sorted.length);

                this.updateState({
                    error: null,
                    data: sorted.map((d) => {
                        return {...d, dateTimeSort: new Date(d.dateTime).getTime() / 1000};
                    }),
                    inProgress: false
                });
            }).catch((error) => {
            this.updateState({
                error: this.tryGetErrorMessage(error),
                data: [],
                inProgress: false
            });
        });
    }

    getLocation() {
        const state = this.state;
        (state as any).anchorEl = null;
        this.updateState({inProgress: true, anchorEl: null});

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                console.log('position', position);
                if (position) {
                    const {latitude, longitude} = position.coords;

                    Geocode.fromLatLng(position.coords.latitude, position.coords.longitude).then(
                        (response) => {
                            const result = response.results[0];

                            const postCode = result.address_components.find((p) => {
                                return p.types.find((t) => {
                                    return t === 'postal_code';
                                });
                            });

                            const address = postCode?.short_name || result.formatted_address;

                            console.log('address', address, response.results[0]);
                            this.updateState({
                                location: {
                                    address
                                },
                                latitude,
                                longitude,
                                distance: 1000,
                                inProgress: false
                            });
                            this.setLocation(address);
                        },
                        (error) => {
                            console.log('address error', error);
                            const address = latitude + ' ' + longitude;
                            this.updateState({
                                location: {
                                    address: latitude + ' ' + longitude
                                },
                                latitude,
                                longitude,
                                distance: 1000,
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

    updateTag = (tag, value) => {
        let {searchValues} = this.state as any;

        searchValues = searchValues.filter((s) => {
            return !_.startsWith(s, tag + ':');
        });

        searchValues.push(tag + ':' + value);

        this.updateState({searchValues, [tag]: value});
    }

    setLocation = (address) => {
        let {searchValues, tagOptions} = this.state as any;

        searchValues = searchValues.filter((s) => {
            return !_.startsWith(s, 'location:');
        });

        searchValues.push('location:' + address);

        tagOptions = tagOptions.filter((s) => {
            return !_.startsWith(s.label, 'location:');
        });

        tagOptions.push({label: 'location:' + address});
        searchValues.push({label: 'distance:' + 1000});
        this.setTags(searchValues, tagOptions);
        this.reloadData();
    }

    onChangeTagsInputValue = (event, value, reason) => {
        console.log('onChangeTagsInputValue', value);

        const state = {};
        value.map((v) => {
            const split = v?.label?.split(':');
            if (split && split.length >= 2) {
                const key = split.shift();
                const rez = split.join(':');
                state[key] = rez;
            }
        });

        this.updateState(state);

        this.setTags([...value]);
        setTimeout(() => {
            this.onChangeSearchInputValue('');
        }, 1);
    }

    onChangeSearchInputValue = (value: string) => {
        const that = this;
        const {searchValues} = this.newState as any;
        this.getQueriesRequest().then();
        clearTimeout(that.timeout);

        const newValues = extractKeywordsAndParams(value);

        this.updateState({
            ...parameterDefaults,
            ...newValues,
            searchText: value,
            inProgress: true
        });

        const timeout = setTimeout(() => {
            if (timeout !== that.timeout) {
                return;
            }
            that.reloadData();
        }, 500);
        that.timeout = timeout;
    }

    parsePrice = (price) => {
        if (!price) {
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

    handleAdd = async (what: Parameters) => {

        this.updateState({
            anchorEl: null
        })

        switch (what) {
            case Parameters.Location:
                this.getLocation();
                break;
            case Parameters.Country:
                const {country} = (await this.showDialog(what)) as any;
                if (country) {
                    this.updateTag(what, country.toLowerCase());
                    this.onChangeSearchInputValue('');
                }
                break;

            case Parameters.Category:
            case Parameters.Distance:
            case Parameters.Vendor:
            case Parameters.Age:
                const data = (await this.showDialog(what)) as any;
                const value = data[what];
                if (value) {
                    this.updateTag(what, value);
                    this.onChangeSearchInputValue('');
                }
                break;
        }
    };

    render = () => {
        const {
            dialogContents,
            dialogCallback,
            dialogLabel,
            column,
            data,
            direction,
            search,
            searchText,
            error,
            location,
            inProgress,
            anchorEl,
            queries
        } = this.state as any;

        let representation = (<p>{JSON.stringify(data, null, 2)}</p>);

        const filteredData = data.filter((d) => {
            if (!isValidPrice(d?.price)) {
                return false;
            }

            if (!_.trim(search)) {
                return true;
            }

            if (!search.length) {
                return true;
            }

            const lowerCase = d?.name?.toLowerCase();
            if (lowerCase) {
                if (search.find((s) => !_.includes(lowerCase, s))) {
                    return false;
                }
            }

            return true;
        });

        //console.log('filteredData', filteredData, data);

        // If it is an array we can show a table
        if (filteredData?.map && filteredData?.length) {
            representation =
                (<Table sortable celled fixed className={styles.table}>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell
                                sorted={column === 'name' ? direction : null}
                                onClick={() => this.handleSort('name', this.state)}
                            >
                                Name
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'priceValue' ? direction : null}
                                onClick={() => this.handleSort('priceValue', this.state)}
                            >
                                Price
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'vendor' ? direction : null}
                                onClick={() => this.handleSort('vendor', this.state)}
                            >
                                Vendor
                            </Table.HeaderCell>
                            <Table.HeaderCell hidden={true}
                                              sorted={column === 'distance' ? direction : null}
                                              onClick={() => this.handleSort('distance', this.state)}
                            >
                                Location
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'dateTimeSort' ? direction : null}
                                onClick={() => this.handleSort('dateTimeSort', this.state)}
                            >
                                Last Date/Time
                            </Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {filteredData && filteredData.map(({
                                                               _id,
                                                               name,
                                                               price,
                                                               vendor,
                                                               distance,
                                                               dateTime,
                                                               metadata,
                                                               dateTimeSort
                                                           }) => (
                            <Table.Row key={_id}>
                                <Table.Cell>{this.formatName(name,metadata)}</Table.Cell>
                                <Table.Cell>{cleanupPriceName(price)}</Table.Cell>
                                <Table.Cell>{vendor}</Table.Cell>
                                <Table.Cell hidden={true}>{distance}</Table.Cell>
                                <Table.Cell>{new Date(dateTime).toLocaleString()}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>);
        } else {
            if (inProgress) {
                representation = (<div><p>Loading data...</p><p>&nbsp;</p></div>);
            } else {
                representation = (
                    <div><p>No data has been found, please change your search, such as remove some terms or use a
                        different term</p><p>&nbsp;</p></div>);
            }
        }

        const boxStyle = {display: 'flex', 'align-items': 'center', justifyContent: 'center'};


        return (
            <div className={styles.container}>
                <Box sx={{display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr'}}>
                    <Link hidden={true} onClick={() => this.getLocation()}><FontAwesomeIcon icon={faLocationCrosshairs}
                                                                                            size="3x"
                                                                                            color="silver"/></Link>
                    <Link hidden={true} onClick={(e) => this.handleClick(e)}><FontAwesomeIcon icon={faCircleChevronDown}
                                                                                              size="3x" color="silver"/></Link>
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
                        <MenuItem onClick={() => this.handleAdd(Parameters.Location)} hidden={true}>Location</MenuItem>
                        <MenuItem onClick={() => this.handleAdd(Parameters.Country)}>Country</MenuItem>
                        <MenuItem onClick={() => this.handleAdd(Parameters.Category)} hidden={true}>Category</MenuItem>
                        <MenuItem onClick={() => this.handleAdd(Parameters.Distance)} hidden={true}>Distance</MenuItem>
                        <MenuItem onClick={() => this.handleAdd(Parameters.Vendor)}>Vendor</MenuItem>
                        <MenuItem onClick={() => this.handleAdd(Parameters.Age)}>Age</MenuItem>
                    </Menu>
                </Box>
                {inProgress ? (<Box style={boxStyle}><CircularProgress/></Box>) : null}
                <Autocomplete
                    sx={{width: 1}}
                    style={{margin: "10px 0"}}
                    id="tags-outlined"
                    options={queries}
                    defaultValue={searchText}
                    freeSolo
                    value={searchText}
                    onInputChange={(event: React.SyntheticEvent, value: string, reason: string) => this.onChangeSearchInputValue(value)}
                    //onChange={(e, value, reason) => this.onChangeTagsInputValue(e, value, reason)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Search"
                            placeholder="Type any product or Bran, for example: Milk"
                            value={searchText}
                        />
                    )}
                />
                <span className={styles.error}>{error}</span>
                {representation}
                <DialogComponent label={dialogLabel} show={!!dialogContents}
                                 onResult={dialogCallback}>{dialogContents}</DialogComponent>
            </div>
        )
    }

    private formatName(name: string, metadata: any) {
        if(!metadata) {
            return name;
        }

        let rez:any = name;

        _.map(metadata, (key,val)=> {
            rez = reactStringReplace(rez, val,(match, i) => ((<pre>{match}</pre>)));
        });

        return rez;
    }
}

export default Data