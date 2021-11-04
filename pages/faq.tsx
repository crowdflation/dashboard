import { NextPage } from 'next'
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
            We mine data by using browser extension. You can download it here: <a href="https://www.dropbox.com/s/jpedyk5hoz18ct8/alphaCheap.zip?dl=1">Alpha Cheap</a>. You will need to load it as unpacked in development mode.
          </p>
          <h2>
            How will you monetise your data?
          </h2>
          <p className={styles.description}>
            We provide data to smart contracts on-chain through Chainlink Oracle adapters. You can check examples in the code section. Long term we hope our technology will be adopted by other data providers and we will be providing technology support and further development for this ecosystem.
          </p>
          <h2>
            How do I know this is a safe project?
          </h2>
          <p className={styles.description}>
            <ul>
              <li>All of our code is open source</li>
              <li>Our founder team and their wallets are disclosed to potential investors</li>
              <li>Our treasury wallet is multi signature, requiring majority of founders to approve transactions</li>
              <li>All funds will be vested, including the ICO and Crowdflation Token holdings</li>
              <li>Delaware C corp has been incorporated to manage development work</li>
              <li>We are aiming to be certified as a B Corporation to further increase transparency</li>
              <li>If there is anything else we can do - please let us know: crowdflationinc@gmail.com</li>
            </ul>
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
          <h2>
            Do you offer an API for your data?
          </h2>
          <p className={styles.description}>
            If you want to get the raw data, you can use this base url `&apos;`https://www.crowdflation.io/api/vendors/&#123;vendor_name&#125;`&apos;` and replace the *&#123;vendor_name&#125;* with whichever vendor you are interested in.<br/>
            You will get a JSON containing the all the data scraped from the vendor you selected.
          </p>
          <h2>
            What does this chart/plot/dashboard exactly show?
          </h2>
          <p className={styles.description}>
            The dashboard shows an estimate of the inflation happening at any given point in time, for the geographic area and the time-period selected. So, when you select a region and a certain period, the dashboard will display a measure of the inflation over that period in that region. Positive values means that inflation is likely occurringoccuring, and negative values represent a deflationary trend. If the line stays flat, i.e. the values are zeros, this indicates that neither an increase nor a decrease in prices was detected.
            Please, always keep in mind that the value displayed/provided by the dashboard is an estimate/measure, and that measure can only be as good as the underlying data is based on. Moreover, that measure is as informative and reflective
          </p>
          <h2>
            How is the inflation estimate/measure calculated?
          </h2>
          <p className={styles.description}>
            The exact method we use to calculate the measure is at the moment quite simplistic and primitive, but still effective in providing a correct idea of what`&apos;`s happening.
            In more detail, we currently just detect fluctuations in prices of the same product. So if we have a price for a particular type of tomatoes at time T, and then we get a new price for that exact type of tomatoes at time T+1, we use these two prices taken at different points in time to detect and calculate what has been the change (positive, negative or no change) over that time-period.
            As always, if you want to verify it yourself, you can consult the source source for this <a href='https://github.com/crowdflation/dashboard/blob/main/pages/api/inflation.ts' target='_blank' rel="noreferrer">here</a>          </p>
          <h2>
            Can you clarify what does &quot;decentralized&quot; means ?
          </h2>
          <p className={styles.description}>
            We aim to enable building a network of multiple nodes that will be gathering data independently from each other, which means that there will be no central entity that can exert control on anybody else. A node can be added or removed from the network without affecting the entire network as a whole.
          </p>
        </div>
      </main>
    </div>
  )
}

export default FAQ
