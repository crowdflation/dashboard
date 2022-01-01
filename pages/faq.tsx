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
    <div className={styles.container}>
      <Head>
        <title>Crowdflation - Crowdsourced Inflation Calculation Group Dashboard</title>
      </Head>

      <main className={styles.main}>
        {!(props as any).untitled?(
          < h1 className={styles.title}>
          Crowdflation FAQ
          </h1>):null
        }
        <div className={styles.description}>
          <h3>
            What do we do?
          </h3>
          <p className={styles.description}>
            We develop technology for gathering user data and applying it in an inflation calculation model (and potentially other applications) in a fully decentralized manner. The resulting model output can be used in blockchain smart contracts through Chainlink oracles.
          </p>
          <h3>
            How do we obtain data?
          </h3>
          <p className={styles.description}>
            We mine data by using a browser extension. You can download it here: <Link href="https://www.dropbox.com/s/jpedyk5hoz18ct8/alphaCheap.zip?dl=1">Alpha Cheap</Link>. You will need to load it as unpacked in development mode.
          </p>
          <h3>
            How will we monetize your data?
          </h3>
          <p className={styles.description}>
            We provide data to smart contracts on-chain through Chainlink Oracle adapters. You can check examples in the code section. Long term we hope our technology will be adopted by other data providers and we will be providing technical support and further development for this ecosystem.
          </p>
          <h3>
            How do I know this is a safe project?
          </h3>
          <p className={styles.description}>
            <ul>
              <li>All of our code is open source</li>
              <li>Our founder team and their wallets are disclosed to potential investors</li>
              <li>Our treasury wallet is multi-signature, requiring a majority of founders to approve transactions</li>
              <li>All funds will be vested, including the ICO and Crowdflation Token holdings</li>
              <li>Delaware C corp has been incorporated to manage development work</li>
              <li>We are aiming to be certified as a B Corporation to further increase transparency</li>
              <li>If there is anything else we can do - please let us know: crowdflationinc@gmail.com</li>
            </ul>
          </p>
          <h3>
            Where can I find raw uploaded data?
          </h3>
          <p className={styles.description}>
            You can look at the uploaded data here: <Link href='/data'>Data Page</Link>
          </p>
          <h3>
            Where can I find your sourcecode?
          </h3>
          <p className={styles.description}>
            You can check out the sourcecode here: <Link href='https://github.com/crowdflation'>https://github.com/crowdflation</Link>
          </p>
          <h3>
            How can I contribute?
          </h3>
          <p className={styles.description}>
            You can join the group by visiting the Discord Server <Link href="https://discord.gg/b6HrzTZ2tF">https://discord.gg/b6HrzTZ2tF</Link>. Once you are there, tell us a bit about your interest and skills. Regular contributors are likely to be rewarded with our token!
          </p>
          <h3>
            Do you offer an API for accessing collected data?
          </h3>
          <p className={styles.description}>
            If you want to get the raw data, you can use this base URL &apos;https://www.crowdflation.io/api/vendors/&#123;vendor_name&#125;&apos; and replace the *&#123;vendor_name&#125;* with whichever vendor you are interested in.<br/>
            You will get a JSON containing all the data scraped from the vendor you selected.
          </p>
          <h3>
            What does this dashboard exactly show?
          </h3>
          <p className={styles.description}>
            The dashboard shows an estimate of the inflation happening at any given point in time, for the geographic area and the time period selected. So, when you select a region and a certain period, the dashboard will display a measure of the inflation over that period in that region. Positive values mean that inflation is likely occurring, and negative values represent a deflationary trend. If the line stays flat, i.e. the values are zeros, this indicates that neither an increase nor a decrease in prices was detected.<br/>
            Please, always keep in mind that the values provided by the dashboard are estimates, and those estimates can only be as good as the underlying data they are based on.
          </p>
          <h3>
            How is the measurement of inflation exactly calculated?
          </h3>
          <p className={styles.description}>
            The exact method we use to calculate the measure of inflation is at the moment quite simplistic and primitive, but still effective in providing a correct idea of what&apos;s happening.
            In more detail, we currently just detect fluctuations in prices of the same product. So if we have a price for a particular type of tomatoes at time T, and then we get a new price for that exact type of tomatoes at time T+1, we use these two prices taken at different points in time to detect and calculate what has been the change (positive, negative or no change) over that time period.
            As always, if you want to verify it yourself, you can consult the sourcecode for this <Link href='https://github.com/crowdflation/dashboard/blob/main/pages/api/inflation.ts'>here</Link>.
            We are planning to update our method to a much more informative and robust one, such as the one used in CPI, in the very near future, as soon as we expand the scraping of raw data to a few new categories of products and services. </p>
          <h3>
            Can you clarify what does &quot;decentralized&quot; mean?
          </h3>
          <p className={styles.description}>
            We aim to enable building a network of multiple nodes that will be gathering data independently from each other, which mean that there will be no central entity that can exert control on anybody else. A node can be added or removed from the network without affecting the entire network as a whole.
          </p>
        </div>
      </main>
    </div>
  )
}

export default FAQ
