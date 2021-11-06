import '../styles/globals.css'
import 'semantic-ui-css/semantic.min.css'
import { AppProps } from 'next/app'
import 'react-vis/dist/style.css'
import styles from '../styles/Home.module.css'
import { Layout } from '../components/layout'
import * as React from "react";

function MyApp({ Component, pageProps }: AppProps) {
  return (<div>
    <div id="overlay">
      <div id="text">Warning: This website is not compatible with mobile browsers. Please turn on Desktop Mode.</div>
    </div>
    <Layout>
      <Component {...pageProps} />
    </Layout>
    <footer className={styles.footer}>©Crowdflation Inc. 2021. All rights Reserved.
  </footer></div>);
}

export default MyApp
