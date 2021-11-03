import '../styles/globals.css'
import 'semantic-ui-css/semantic.min.css'
import { AppProps } from 'next/app'
import 'react-vis/dist/style.css'
import styles from '../styles/Home.module.css'
import { Layout } from '../components/layout'
import * as React from "react";

function MyApp({ Component, pageProps }: AppProps) {
  return (<div>
    <Layout>
      <Component {...pageProps} />
    </Layout>
    <footer className={styles.footer}>Powered by sheer willpower. ©Crowdflation Inc. 2021. All rights Reserved.
  </footer></div>);
}

export default MyApp
