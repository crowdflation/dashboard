import React, {Component} from "react";
import VendorBasket from "../components/vendor-basket";
import {Grid} from "@mui/material";
import styles from "../styles/Home.module.css";
import {connectToDatabase} from "../lib/util/mongodb";
import {getSession, loadBaskets, obtainSessionAndBasket} from "./api/baskets";
import Link from "next/link";
import Geocode from "react-geocode";


export async function getServerSideProps({req, res}) {
    const {db} = await connectToDatabase();
    const vendorBaskets = await obtainSessionAndBasket(req, res, db);
    const apiKey: string = (process.env as any).GOOGLE_MAPS_API_KEY as string;

    return {
        props: {
            vendorBaskets,
            apiKey
        }
    };
}

class Baskets extends Component {

    handleSort = (column, vendor) => {

    }
    addItems = (vendor) => {

    }
/*
    getDistance =(vendor: string) => {
        const {location} = this.state as any;

        var address = document.getElementById("addressInput").value;
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({address: address}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                searchLocationsNear(results[0].geometry.location);
            } else {
                alert(address + ' not found');
            }
        });


        return '1 KM';
    }

    getDistances = () => {

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


 */

    constructor(props: any) {
        super(props);
        const vendors:any[] = [];
        let max = 0;

        Object.keys(props.vendorBaskets).forEach((vendor) => {
            const products: any[] = [];
            let total = 0;
            let count = 0;

           Object.keys(props.vendorBaskets[vendor]).forEach((name)=> {
               const product = props.vendorBaskets[vendor][name];
               if(!product.amount) {
                   return;
               }
               products.push({
                   name,
                   count: product.amount,
                   price: product.price
               });

               console.log('product', product);

               total += product.amount * parseFloat(product.price);
               count++;
           });
           if(count<=0) {
               return;
           }

            max = Math.max(max, total);

            const vendorData = {
                vendor: vendor,
                //distance: this.getDistance(vendor),
                products,
                total,
                save: 1,
                currency: this.getCurrency(vendor),
                column:null,
                direction: false,
                handleSort: this.handleSort,
                addItems: this.addItems
            };


            vendors.push(vendorData);
        });

        vendors.forEach((v)=> {
            v.save = max - v.total;
        });

        this.state = {
            vendors
        };

        Geocode.setApiKey(props.apiKey);
        Geocode.setLanguage("en");
    }

    render = () => {
        const {vendors} = this.state as any;

        return (<div className={styles.container}><Grid container spacing={2}>
            <Grid item xs={12}>
                <h1>Baskets</h1>
            </Grid>
            {
                vendors.map((v)=>{
                    return (<Grid item xs={4}><VendorBasket vendorData={v}></VendorBasket></Grid>);
                })
            }
            {
                vendors?.length?(<h2 className={styles.linky}><Link href='/products'>Add Items for any Vendor</Link></h2>):(
                    <h2 className={styles.linky}><Link href='/products'>No Baskets Found, please Add Some Items</Link></h2>
                )
            }

        </Grid></div>);
    }

    private getCurrency(vendor: string) {
        return 'GBP';
    }
}

export default Baskets