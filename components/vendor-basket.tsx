import {NextPage} from "next";
import {Table} from "semantic-ui-react";
import 'semantic-ui-css/components/table.min.css'
import 'semantic-ui-css/components/icon.min.css'
import React from "react";
import {Grid} from "@mui/material";
import Link from "next/link";
import styles from '../styles/Baskets.module.css'

const VendorBasket: NextPage<any> = ({vendorData}) => {
    const {vendor, distance, total, save, currency, products, column, direction, handleSort, addItems} = vendorData as any;
    const table = (<Table sortable celled fixed>
        <Table.Header>
            <Table.Row>
                <Table.HeaderCell width={8}
                    sorted={column === 'name' ? direction : null}
                    onClick={() => handleSort('name', vendor)}
                >
                    Name
                </Table.HeaderCell>
                <Table.HeaderCell width={3}
                    sorted={column === 'count' ? direction : null}
                    onClick={() => handleSort('count', vendor)}
                >
                    No
                </Table.HeaderCell>
                <Table.HeaderCell
                    sorted={column === 'count' ? direction : null}
                    onClick={() => handleSort('price', vendor)}
                >
                    Price
                </Table.HeaderCell>
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {products && products.map(({ name, count, price  }) => (
                <Table.Row key={name}>
                    <Table.Cell>{name}</Table.Cell>
                    <Table.Cell>{count}</Table.Cell>
                    <Table.Cell>{price} {currency}</Table.Cell>
                </Table.Row>
            ))}
        </Table.Body>
    </Table>);
    return <Grid container>
        <Grid item xs={12} sx={{textTransform: 'uppercase'}}>{vendor}</Grid>
        {/*<Grid item xs={6}>{distance} away</Grid>*/}
        <Grid item xs={6}>Total:</Grid><Grid item xs={6}>{total.toFixed(2)} {currency}</Grid>
        <Grid item xs={6}>You Save:</Grid><Grid item xs={6}>{save.toFixed(2)} {currency}</Grid>
        <Grid item xs={12} className={styles.linky}>
            <Link href={`/products?search=vendor:${vendor}`}  onClick={()=>addItems(vendor)}>Add Items</Link>
        </Grid>
        {table}
    </Grid>;
};

export default VendorBasket;