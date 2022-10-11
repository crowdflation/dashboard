import { NextPage } from 'next'
import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'


interface Untitlable {
  untitled: boolean | undefined;
}


const FAQ: NextPage<Untitlable> = (props:Untitlable) => {
  return (
    <div className={styles.container+' '+styles["faq-section"]}>

      <main className={styles.main}>
        {/* {!(props as any).untitled?(
          < h1 className={styles.title}>
          Crowdflation FAQ
          </h1>):null
        } */}

        <h2>FAQs</h2>

        <div>

          <div className={styles["faq-cell"]}>
            <h3>
              What is this project about?
            </h3>
            <p>
              We fundamentally do two things: we gather data and we build technology. <br />
              We use our technology to acquire the raw data used to build alternative inflation measures. <br />
              But at the core of our technology there are tools to help both individuals and organizations understand the state of the economy and 
              gain insights useful to navigate difficult and uncertain times. <br />
              As consumer you might be interested in finding out where you could buy your favourite groceries the cheapest, 
              whereas an organization might want to analyze some more high-level measures —
              such as the inflation rate timeseries for a specific basket of goods — with high granularity and temporal resolution. <br />
              For this reason, we are currently focusing on a platform to facilitate products prices comparison, 
              to complement the dashboard which is intended to be the place to consult analytics and stats. 
            </p>
          </div>

          <div className={styles["faq-cell"]}>
            <h3>
              I've read the project is open-source. Where can I find the source code?
            </h3>
            <p>
              You can check out our GitHub <a target="_blank" href="https://github.com/crowdflation">repo</a>. 
            </p>

          </div>

          <div className={styles["faq-cell"]}>
            <h3>
              How can I contribute?
            </h3>
            <p>
              There are a bunch of ways in which you can contribute; A few examples are:
              <ul>
                <li> Be actively involved with the data gathering</li>
                <li> Expanding our set of data sources</li>
                <li> Labeling data used to train AI models</li>
                <li> Help us build our technology and platforms</li>
              </ul>  
              If you're interested, please join our <a target="_blank" href="https://discord.com/invite/b6HrzTZ2tF">Discord</a> community! 
              Once there, tell us a bit about your interests and skills.
            </p>
          </div>

          <div className={styles["faq-cell"]}>
            <h3>
              What does the dashboard show exactly?
            </h3>
            <p>
              The dashboard shows an estimate of the inflation happening at any given point in time, for the geographic area and the time period selected.
              <br/> <br />
              We're planning to release the new version of the dashboard soon, but if you're interested in having early access and testing it out, please let us now! 
            </p>
          </div>
        
        </div>
      </main>
    </div>
  )
}

export default FAQ
