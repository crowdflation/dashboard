import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Untitled Inflation Calculation Group Dashboard</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Inflation Calculation group Dashboard Page. This page was built with
        </h1>

        <p className={styles.description}>
          You can join the group by visiting the <a href="https://discord.gg/NJuxWvS9">Discord Chanel</a>. Dont be surprised by the &quot;Hackaton Projects&quot; title
        </p>

        <p className={styles.description}>
          We mine data by using browser extension. You can download it here: <a href="https://www.dropbox.com/s/o10o6lpfoc2zupw/alphaCheap.crx?dl=1">Alpha Cheap</a>.

        </p>
        <p>
          For now it only works on Walmart sites. You can look at the uploaded data here: <Link href='/data'>Data Page </Link>
        </p>
      </main>

      <footer className={styles.footer}>
          Powered by sheer willpower
      </footer>
    </div>
  )
}

export default Home
