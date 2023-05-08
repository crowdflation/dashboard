import React, { Component } from 'react';
import styles from '../styles/Home.module.css'
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Link from "next/dist/client/link";
import {NextRouter, withRouter} from 'next/router'


function LinkTab(props) {
  return (
    <Tab
      component="a"
      onClick={(event) => {
        //event.preventDefault();
      }}
      {...props}
    />
  );
}

interface WithRouterProps {
  router: NextRouter
}

interface MyComponentProps extends WithRouterProps {}

class Layout extends Component<MyComponentProps> {
  constructor(props: any) {
    super(props);

    let tab:number|undefined = undefined;
    switch(this?.props?.router?.pathname) {
      case '/products':
        tab = 0;
        break;
      case '/faq':
        tab = 1;
        break;
    }

    this.state = {
      value: tab
    };
  }


  handleChange = (event, newValue) => {
    this.setState({value: newValue || 0});
  };

  render () {
    const { value } = this.state as any;
    const { children } = this.props;
    return (
      <div>
        <div className={styles.header}>
          <div>
            <h1><Link href='/'><a className={styles.headerLink}>Crowdflation</a></Link></h1>
          </div>
          <div className={styles.subtitle}>
          </div>
          <div>
            <Tabs
              className={styles.navbar}
              value={value}
              onChange={this.handleChange}
              aria-label="nav tabs example" 
              sx={{
                '& .MuiTabs-flexContainer': {justifyContent: "center"}
              }}
            >
              <LinkTab label="Inflation Dashboard" href="/inflation" />
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
export default withRouter(Layout);
