import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import 'normalize.css';

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Crowdflation - Crowdsourced Inflation and Economic Data</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.showcase}>
          <div className={styles.maindescr}>
            <h3>
              An independent, alternative source for inflation and economic data.
            </h3>
          </div>
          <div className={styles.mainimage}>
            <img src="./crowdf_dashb.png" alt="image" />
          </div>
        </div>

        <div className={styles["small-container"]}>
          <p id={styles["first-parag"]}>
            Crowdflation gives you access to alternative measures about inflation and to the underlying raw data. 
            To put these data to work, we are developing the tools to serve different use-cases and to help users 
            gaining insights about what matters to them the most. Whether you're looking for where you could buy your groceries 
            the cheapest, or interested in finding out what's your country current inflation rate, you will be able to find 
            the relevant answers to your questions. 
          </p>

          <h4>Our approach</h4>
          <p>
            We collect the actual prices of goods and services from a variety of sources and our inflation measures are derived bottom-up from the raw prices. 
            The data collection process is designed to be performed via crowdsourcing. So, anybody could become a data contributor. 
            These two main aspects make us indipendent. Equally importantly, this also allows for a high degree of granularity and 
            temporal resolution, to the point where you could dive all the way down to single items price differences
            — by the week or even the day — to develop a better understanding of the higher level results you are seeing.  
          </p>

          <h4>About the project</h4>
          <p> 
            Crowdflation is currently under development and still in the early stages. <br /> 
            For the most part, the project is open-source and has been intended to allow community members 
            to contribute in different way.
            You can find some more detail <Link href='/faq'>here</Link>, but the best way is to <a href="https://discord.gg/b6HrzTZ2tF" target="_blank" rel="noopener noreferrer">join</a> our Discord and chat directly with us. 
          </p>
        </div>

      </main>
      <br/>
    </div>
  )
}

export default Home
