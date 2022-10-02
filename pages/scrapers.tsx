import styles from '../styles/Home.module.css'
import React, {Component} from 'react'
import {Table} from 'semantic-ui-react'
import _ from 'lodash'
import axios from 'axios'
import {connectToDatabase} from "../lib/util/mongodb"
import {
    Container,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Input,
    MenuItem, Radio,
    RadioGroup,
    Select,
    Stack,
    TextareaAutosize
} from '@mui/material';
import {countryCodes, codeToCountryMap} from '../data/countries'
import {getScrapers} from './api/scrapers'


export async function getServerSideProps() {
    const {db} = await connectToDatabase();
    const scrapers = (await getScrapers(db)).map((s) => {
            const res = {...s, ...s.scraper, added: s.added.toISOString() };
            delete res.scraper;
            delete res._id;
            return res;
    });
    console.log('scrapers', scrapers);

    return {
        props: {scrapers}, // will be passed to the page component as props
    }
}

class Scrapers extends Component {

    constructor(props: any) {
        super(props);
        this.state = {
            column: null,
            scrapers: props.scrapers,
            direction: null,
            errors: null,
            how: 'Separate Fields',
            inputData: {}
        };

        this.handleChange = this.handleChange.bind(this);
    }

    handleChange = (e: any) => {
        console.log('handleChange e.target.value',e.target.value);
        this.setState({
            ...this.state,
            inputData: {...(this.state as any).inputData,[e.target.name]: e.target.value}
        });
    }


    handleChangeJSON = (e: any) => {
        console.log('handleChange e.target.value',e.target.value);
        this.setState({
            ...this.state,
            inputData: {...(this.state as any).inputData,[e.target.name]: JSON.parse(e.target.value)}
        });
    }

    handleChangeInputData = (e: any) => {
        console.log('handleChangeInputData e.target.value',e.target.value);
        this.setState({
            ...this.state,
            inputData: JSON.parse(e.target.value)
        });
    }

    handleRadioChange = (e: any) => {
        this.setState({
            ...this.state,
            how: e.target.value
        });
    }

    handleSort = (column: string, state: any) => {
        if (state.column === column) {
            return this.setState({
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
        // Make a request for a user with a given ID
        axios.get('/api/scrapers/')
            .then((response) => {
                // handle success
                this.setState({
                    ...state,
                    error: null,
                    scrapers: response.data
                });
            }).catch((error) => {
            this.setState({
                ...state,
                error: this.tryGetErrorMessage(error),
                data: []
            });
        });
    }

    useAsTemplate = (t) => {
        this.setState({...this.state, inputData: t});
    }

    save = () => {
        const that = this;
        const {
            name,
            country,
            urlRegex,
            itemSelector,
            parsers,
            requiredFields,
            copyFields,
            website,
            walletAddress
        } = (this.state as any).inputData;
        const {scrapers} = this.state as any;
        // Make a request for a user with a given ID
        axios.post('/api/scrapers', {
            website,
            walletAddress,
            scraper: {name, country, urlRegex, itemSelector, parsers, requiredFields, copyFields}
        })
            .then(() => {
                const newScrapers = scrapers.slice();
                newScrapers.push((this.state as any).inputData);
                const newState = {
                    ...this.state,
                    scrapers: newScrapers,
                    inputData: { walletAddress, country },
                    success: 'Item added',
                    error: null,
                };
                console.log('newState',newState, scrapers);
                // handle success
                this.setState(newState);
            }).catch((error) => {
            this.setState({
                ...this.state,
                success: null,
                error: this.tryGetErrorMessage(error),
            });
        });
    }

    render = () => {
        const {column, scrapers, direction, aggregateResult, error, inputData, how, success} = this.state as any;
        let representation: any = null;

        // If it is an array we can show a table
        if (scrapers?.map && !aggregateResult) {
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
                                sorted={column === 'country' ? direction : null}
                                onClick={() => this.handleSort('country', this.state)}
                            >
                                Country
                            </Table.HeaderCell>
                            <Table.HeaderCell width={2}
                                sorted={column === 'urlRegex' ? direction : null}
                                onClick={() => this.handleSort('urlRegex', this.state)}
                            >
                                Url Regex
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'itemSelector' ? direction : null}
                                onClick={() => this.handleSort('itemSelector', this.state)}
                            >
                                Item Selector
                            </Table.HeaderCell>
                            <Table.HeaderCell width={3}
                                sorted={column === 'parsers' ? direction : null}
                                onClick={() => this.handleSort('parsers', this.state)}
                            >
                                Parsers
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'requiredFields' ? direction : null}
                                onClick={() => this.handleSort('requiredFields', this.state)}
                            >
                                Required Fields
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'copyFields' ? direction : null}
                                onClick={() => this.handleSort('copyFields', this.state)}
                            >
                                Fields Copied
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'website' ? direction : null}
                                onClick={() => this.handleSort('website', this.state)}
                            >
                                Website
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'walletAddress' ? direction : null}
                                onClick={() => this.handleSort('walletAddress', this.state)}
                            >
                                Author Wallet Address
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                sorted={column === 'added' ? direction : null}
                                onClick={() => this.handleSort('added', this.state)}
                            >
                                Date/Time Added
                            </Table.HeaderCell>
                            <Table.HeaderCell>
                                Copy
                            </Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {scrapers && scrapers.map(({
                                                       _id,
                                                       name,
                                                       country,
                                                       urlRegex,
                                                       itemSelector,
                                                       parsers,
                                                       requiredFields,
                                                       copyFields,
                                                       website,
                                                       walletAddress,
                                                       added
                                                   }) => (
                            <Table.Row key={_id}>
                                <Table.Cell>{name}</Table.Cell>
                                <Table.Cell>{codeToCountryMap[country].name}</Table.Cell>
                                <Table.Cell>{urlRegex}</Table.Cell>
                                <Table.Cell>{itemSelector}</Table.Cell>
                                <Table.Cell>{JSON.stringify(parsers, null, 2)}</Table.Cell>
                                <Table.Cell>{JSON.stringify(requiredFields)}</Table.Cell>
                                <Table.Cell>{JSON.stringify(copyFields)}</Table.Cell>
                                <Table.Cell>{website}</Table.Cell>
                                <Table.Cell>{walletAddress}</Table.Cell>
                                <Table.Cell>{added}</Table.Cell>
                                <Table.Cell>
                                    <button onClick={() => this.useAsTemplate({
                                        name,
                                        country,
                                        urlRegex,
                                        itemSelector,
                                        parsers,
                                        requiredFields,
                                        copyFields,
                                        website,
                                        walletAddress,
                                        added
                                    })}>Use as Template
                                    </button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>);
        }

        return (
            <div className={styles.container}>
                <h1>Scrapers</h1>
                <p>This Page is for viewing and adding new simple Scrapers for Websites. Scrapers enable our browser
                    extension to understand new websites and obtain data from them. If website changes often times we
                    need to change the scraper as well. If your scraper is being used, and is registered with your
                    wallet you will earn a small commission fee out of it. Adding a new scraper requires some
                    understanding of how css selectors work, but can be learned with a bit of effort.</p>
                <h3>Current Scrapers are below:</h3>
                <span className={styles.error}>{error}</span>
                {representation}
                <h3>Add New Scraper</h3>
                <FormControl component="fieldset">
                    <h4>Input Scraper as:</h4>
                    <RadioGroup row aria-label="how" name="how" defaultValue={how} onChange={this.handleRadioChange.bind(this)}>
                        <FormControlLabel value="Separate Fields" control={<Radio/>} label="Separate Fields"/>
                        <FormControlLabel value="JSON Object" control={<Radio/>} label="JSON Object"/>
                    </RadioGroup>
                </FormControl>
                {how === "Separate Fields" ? (<Stack>
                    <FormControl>
                        <h4>Vendor Name</h4>
                        <Input aria-describedby="name-helper-text" name='name' value={inputData.name}
                               onChange={this.handleChange.bind(this)}/>
                        <FormHelperText id="name-helper-text">This is vendor name, for example: Albertsons.</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <h4>Country</h4>
                        <Select aria-describedby="country-helper-text" name='country'
                                defaultValue={inputData.country || 'US'} onChange={this.handleChange.bind(this)}>
                            {countryCodes.map((cc) => (<MenuItem key={cc} value={cc}>{codeToCountryMap[cc].name}</MenuItem>))}
                        </Select>
                        <FormHelperText id="country-helper-text">The country where the scraper applies.</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <h4>Url Regex</h4>
                        <Input aria-describedby="url-regex-helper-text" name='urlRegex'
                               value={inputData.urlRegex} onChange={this.handleChange.bind(this)}
                               placeholder="/^https?:\/\/(?:[^./?#]+\.)?albertsons\.com\/shop\/search\-results\.html\?q=*/"/>
                        <FormHelperText id="url-regex-helper-text">Describes the Regex match for the URL which should be
                            scraped.</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <h4>Item Selector</h4>
                        <Input aria-describedby="name-helper-text" name='itemSelector'
                               value={inputData.itemSelector} onChange={this.handleChange.bind(this)}
                               placeholder="product-item-v2"/>
                        <FormHelperText id="name-helper-text">This is a CSS selector to help find all the items on the
                            page to select.</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <h4>Parsers</h4>
                        <TextareaAutosize aria-describedby="name-helper-text" name='parsers' minRows={3}
                                          defaultValue={JSON.stringify(inputData.parsers, null, 2)} onChange={this.handleChangeJSON.bind(this)}
                                          placeholder="{
      pricePerUnit: ['.product-price-qty', 0],
      price: ['.product-price', 0],
      name: ['.product-title', 0],
      discount: ['.single-coupon-details>div', 0]
    }"/>
                        <FormHelperText id="parsers-helper-text">This contains all the parsers in a JSON object. The key
                            is the name of the field where the data is saved, the values are a parser and which node
                            from array should be taken - usually 0 for first.</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <h4>Copied Fields from Others</h4>
                        <TextareaAutosize aria-describedby="name-helper-text" name='copyFields' minRows={3}
                                          defaultValue={JSON.stringify(inputData.copyFields, null, 2)} onChange={this.handleChangeJSON.bind(this)}
                                          placeholder="{pricePerUnit: 'price'}"/>
                        <FormHelperText id="name-helper-text">Which fields can be copied from another field if empty.
                            The key is the "from" field and the value is "to" field. This can be also used to make sure
                            necessary fields can be taken from a few parsers if not found.</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <h4>Required Fields</h4>
                        <TextareaAutosize aria-describedby="name-helper-text" name='requiredFields' minRows={3}
                                          defaultValue={JSON.stringify(inputData.requiredFields)}
                                          onChange={this.handleChangeJSON.bind(this)} placeholder="['name', 'price']"/>
                        <FormHelperText id="name-helper-text">Which fields must be populated for data to be valid.
                            Usually price and name.</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <h4>Website</h4>
                        <Input aria-describedby="name-helper-text" name='website' value={inputData.website}
                               onChange={this.handleChange.bind(this)} placeholder="https://www.albertsons.com"/>
                        <FormHelperText id="name-helper-text">Which website is this scraper for</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <h4>Wallet Address</h4>
                        <Input aria-describedby="name-helper-text" name='walletAddress'
                               value={inputData.walletAddress} onChange={this.handleChange.bind(this)}
                               placeholder="0x35A1Be49DdD2979f8f260E5B8d748ed4587053ab"/>
                        <FormHelperText id="name-helper-text">This is a Binance Smart Chain wallet address. If you fill
                            this out, you should be paid commission when a website is scraped</FormHelperText>
                    </FormControl></Stack>) : (<Container><FormControl style={{width:'100%'}}>
                    <h4>Required Fields</h4>
                    <TextareaAutosize aria-describedby="name-helper-text" name='inputData' minRows={20}
                                      defaultValue={_.isEmpty(inputData)?'':JSON.stringify(inputData, null, 2)}
                                      onChange={this.handleChangeInputData.bind(this)} placeholder={JSON.stringify({
                        "name": "albertsons",
                        "country": "US",
                        "urlRegex": "/^https?://(?:[^./?#]+\\.)?albertsons\\.com/shop/search\\-results\\.html\\?q=*/",
                        "itemSelector": "product-item-v2",
                        "parsers": {
                            "pricePerUnit": [
                                ".product-price-qty",
                                0
                            ],
                            "price": [
                                ".product-price",
                                0
                            ],
                            "name": [
                                ".product-title",
                                0
                            ],
                            "discount": [
                                ".single-coupon-details>div",
                                0
                            ]
                        },
                        "requiredFields": [
                            "name",
                            "price"
                        ],
                        "copyFields": {
                            "pricePerUnit": "price"
                        },
                        "website": "https://www.albertsons.com",
                        "walletAddress": "0x35A1Be49DdD2979f8f260E5B8d748ed4587053ab"
                    }, null, 2)}/>
                    <FormHelperText id="name-helper-text">This input has to be a fully formatted JSON with all
                        values.</FormHelperText>
                </FormControl></Container>)}
                <span className={styles.error}>{error}</span>
                <span className={styles.success}>{success}</span>
                <button onClick={() => this.save()}>Save</button>
            </div>
        )
    }
}

export default Scrapers;