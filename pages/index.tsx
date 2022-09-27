import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import 'normalize.css';

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Crowdflation Inc - Crowdsourced Inflation Calculation Group Dashboard</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to the Crowdflation Community
        </h1>

        <h2>A transparent and decentralized source of data for Inflation</h2>
        <p> We are building a global dashboard about inflation.
            Our data is crowdsourced and then stored in a decentralized manner, available at any time for further consultation/verificatio/usage/analysis. 
            Trust, but verify.
        </p>

        <iframe width="560" height="315" src="https://www.youtube.com/embed/AidIdovi7ok" title="Crowdflation Community"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen></iframe>

        <br/>
        <p className={styles.description}>
          Check out the <Link href='/faq'>FAQ here </Link>
        </p>

        <p className={styles.description}>
          You can earn more CRWD tokens if you  <Link href="/contribute">contribute</Link>
        </p>

        <p className={styles.description}>
          Have further questions, or care to contribute in conversation - <a href="https://discord.gg/b6HrzTZ2tF">Join our Discord Channel</a>.
        </p>

        <p className={styles.description}>
          We mine data by using a browser extension. You can download it here: <a href="https://www.dropbox.com/s/jpedyk5hoz18ct8/alphaCheap.zip?dl=1">Alpha Cheap</a>. You will need to load it as unpacked in development mode.
        </p>
        <p className={styles.description}>
          Check out our inflation calculation for the US: <Link href='/inflation'>Dashboard Page </Link>
        </p>
        <p className={styles.description}>
          All of our code is open source as is available on <a href={'https://github.com/crowdflation'}>GitHub</a>
        </p>
        <p className={styles.description}>
          You can look at the uploaded data here: <Link href='/data'>Data Page </Link>
        </p>
      </main>
      <p>This page was built with <a href="https://nextjs.org/" target={'_blank'} rel="noreferrer">Next.JS</a></p>
      <br/>
    </div>
  )
}

export default Home
