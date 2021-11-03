import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Crowdflation - Crowdsourced Inflation Calculation Group Dashboard</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Crowdflation FAQ.
        </h1>
        <h2>
          What do you do?
        </h2>
        <p className={styles.description}>
          We develop technology for gathering user data and applying it in an inflation calculation model (and potentially other applications) in a fully decentralised manner. The resulting model output can be used in blockchain smart contracts trough Chainlink oracles.
        </p>
        <h2>
          How do you obtain data?
        </h2>
        <p className={styles.description}>
          We mine data by using browser extension. You can download it here: <a href="https://www.dropbox.com/s/155x185mfas7u4z/alphaCheap.crx?dl=1">Alpha Cheap</a>.
        </p>
        <h2>
          Where can I find raw uploaded data?
        </h2>
        <p className={styles.description}>
          You can look at the uploaded data here: <Link href='/data'>Data Page </Link>
        </p>
        <h2>
          Where can I find your sourcecode?
        </h2>
        <p className={styles.description}>
          You can check out the sourcecode here: <a href={'https://github.com/crowdflation'}>https://github.com/crowdflation</a>
        </p>
        <h2>
          How can I contribute?
        </h2>
        <p className={styles.description}>
          You can join the group by visiting the <a href="https://discord.gg/b6HrzTZ2tF">Discord Server</a>. Once you are there, tell us a bit about your interest and skills. Regular contributors are likely to be rewarded with our token!
        </p>
      </main>
    </div>
  )
}

export default Home
