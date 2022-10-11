import '../styles/globals.css'
// import 'semantic-ui-css/semantic.min.css'
import { AppProps } from 'next/app'
import 'react-vis/dist/style.css'
import styles from '../styles/Home.module.css'
import { Layout } from '../components/layout'
import * as React from "react";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div>
      <div id="overlay">
        <div id="text">This website is not compatible with small screens. Please turn on Desktop Mode or rotate the device.</div>
      </div>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <footer className={styles.footer}>© Crowdflation Inc. 2022. All rights reserved.</footer>
    </div>
  );
}

export default MyApp
