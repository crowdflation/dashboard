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
          Welcome to Crowdflation Inc
        </h1>

        <h2>Better Inflation Calculation Dashboard Page</h2>

        <iframe width="560" height="315" src="https://www.youtube.com/embed/AidIdovi7ok" title="Crowdflation Community"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen></iframe>

        <p className={styles.description}>
          Check out the <Link href='/faq'>FAQ here </Link>
        </p>

        <p className={styles.description}>
          Have further questions, or care to contribute - <a href="https://discord.gg/b6HrzTZ2tF">Join our Discord Chanel</a>.
        </p>

        <p className={styles.description}>
          We mine data by using browser extension. You can download it here: <a href="https://www.dropbox.com/s/155x185mfas7u4z/alphaCheap.crx?dl=1">Alpha Cheap</a>.
        </p>
        <p className={styles.description}>
          Check out our inflation calculation for the US: <Link href='/inflation'>Dashboard Page </Link>
        </p>
        <p className={styles.description}>
          You can look at the uploaded data here: <Link href='/data'>Data Page </Link>
        </p>
      </main>
      <p>This page was built with <a href="https://nextjs.org/">Next.JS</a></p>
    </div>
  )
}

export default Home
