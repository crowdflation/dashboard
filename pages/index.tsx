import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Crowdflation Inc - Crowdsourced Inflation Calculation Group Dashboard</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Crowdflation Inc - a better Inflation Calculation Dashboard Page.
        </h1>

        <p className={styles.description}>
          You can join the group by visiting the <a href="https://discord.gg/b6HrzTZ2tF">Discord Chanel</a>.
        </p>

        <p className={styles.description}>
          We mine data by using browser extension. You can download it here: <a href="https://www.dropbox.com/s/155x185mfas7u4z/alphaCheap.crx?dl=1">Alpha Cheap</a>.
        </p>
        <p>
          Check out our inflation calculation for the US: <Link href='/inflation'>Data Page </Link>
        </p>
        <p>
          You can look at the uploaded data here: <Link href='/data'>Data Page </Link>
        </p>
      </main>
      <p>This page was built with <a href="https://nextjs.org/">Next.JS</a></p>
    </div>
  )
}

export default Home
