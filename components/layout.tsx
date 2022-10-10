// components/Layout.js
import React, { Component } from 'react';
import styles from '../styles/Home.module.css'
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Link from "next/dist/client/link";

function LinkTab(props) {
  return (
    <Tab
      component="a"
      onClick={(event) => {
        event.preventDefault();
      }}
      {...props}
    />
  );
}

export class Layout extends Component {
  constructor(props: any) {
    super(props);
    this.state = {
    };
  }

  handleChange = (event, newValue) => {
    console.log('newValue', newValue);
    this.setState(newValue);
  };

  render () {
    const { value } = this.state as any;
    const { children } = this.props;
    return (
      <div>
        <div className={styles.header}>
          <div>
            <h1><Link href='/'>Crowdflation</Link></h1>
          </div>
          {/* <div className={styles.navbar}> */}
          <div>
            <Tabs
              className={styles.navbar} 
              value={value} 
              onChange={this.handleChange} 
              aria-label="nav tabs example" 
              sx={{
                '& .MuiTabs-flexContainer': {justifyContent: "end"}
              }}
            >
              <LinkTab label="Dashboard" href="/inflation" />
              <LinkTab label="FAQ" href="/faq" />
              {/* <LinkTab label="Code" href="/code" /> */}
            </Tabs>
          </div>
        </div>
        <div>
          {children}
        </div>
      </div>
    );
  }
}