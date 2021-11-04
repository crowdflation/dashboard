import '../styles/globals.css'
import 'semantic-ui-css/semantic.min.css'
import { AppProps } from 'next/app'
import 'react-vis/dist/style.css'
import styles from '../styles/Home.module.css'
import { Layout } from '../components/layout'
import * as React from "react";

function MyApp({ Component, pageProps }: AppProps) {
  return (<div>
    <head>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css"
            integrity="sha512-NhSC1YmyruXifcj/KFRWoC561YpHpc5Jtzgvbuzx5VozKpWvQ+4nXhPdFgmx8xqexRcpAglTj9sIBWINXa8x5w=="
            crossOrigin="anonymous" referrerPolicy="no-referrer"/>
    </head>
    <Layout>
      <Component {...pageProps} />
    </Layout>
    <footer className={styles.footer}>©Crowdflation Inc. 2021. All rights Reserved.
  </footer></div>);
}

export default MyApp
