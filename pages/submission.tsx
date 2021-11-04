import {NextPage} from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import FAQ from "./faq";
import Code from "./code";
import Inflation from "./inflation";
import {calculateInflation} from "./api/inflation";
import Link from "next/dist/client/link";


export async function getServerSideProps() {
  const resultObject = await calculateInflation({});
  const apiKey: string = (process.env as any).GOOGLE_MAPS_API_KEY as string;
  console.log('apiKey', apiKey);
  return {
    props: {resultObject, apiKey}, // will be passed to the page component as props
  }
}

const Submission: NextPage = (props) => {
  return <div className={styles.container}>
    <Head>
      <title>Crowdflation Inc - Submission for the 1729 Inflation Dashboard Challenge</title>
    </Head>

    <main className={styles.main}>
      <h1 className={styles.title}>
        1729 Inflation Challenge.
      </h1>

      <div className={styles.container}>
        <div className={styles.description}>

          <p>Over the past few months, a few of us have worked on the 1729 Decentralized Inflation Dashboard challenge.
            This
            is a project born out of the 1729 challenge.</p>

          <p>As described on the page of the 1729 challenge, inflation is a monetary phenomenon that is both a function of
            money printing and the mass psychology of people&rsquo;s beliefs on the direction of how goods and
            services
            will be priced. In certain circumstances and certain places such as Argentina and Venezuela, discussion of
            inflation may be censored for this reason. Other countries such as Afghanistan might attempt to ban all
            foreign
            currencies as a last ditch attempt to control inflation. The use of this forceful approach rarely bodes well
            for
            anyone.</p>

          <p>We have decided to help counter censorship efforts by governments and other entities by building a
            decentralised inflation dashboard and data-source. To build a decentralised inflation data source, we have
            taken
            the approach of creating an incentive mechanism in which to crowdsource the relevant pricing data to calculate
            inflation. This is currently done through a browser extension we created: Alpha Cheap. You can download it on
            our <Link href='/'>Home Page</Link></p>

          <p>We have built a technology in which an individual may contribute pricing data of their &lsquo;local
            merchants&rsquo; which with enough data would be an inferential method in which to observe pricing direction
            in
            that &lsquo;local&rsquo; society and for a customisable basket of goods. Through the calculated pricing
            direction, a decentralised dashboard and indicator of pricing can be constructed.</p>

          <p>In our current iteration, only the U.S. is seen. We have built this through the scraping of major websites
            and
            channels that could reflect how prices are behaving.</p>

          <p>A weakness of the approach we have constructed is in &lsquo;offline&rsquo; prices and in determining
            sentiment.
            However we are planning to develop a mobile app for capturing offline data. Sentiment can also be constructed
            via voting/betting behaviours which would help account for this factor and create a more granular futures
            market.</p>

        </div>
      </div>
      <h2>Our Approach Explained Via 80 Second Video</h2>
      <iframe width="560" height="315" src="https://www.youtube.com/embed/AidIdovi7ok" title="Crowdflation Community"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen></iframe>
      <h2>
        Calculator
      </h2>
      <Inflation {...props}/>


      <h2>
        The Future of Crowdflation Inc & FAQ
      </h2>
      <p className={styles.description}>You can check out our presentation about our company <a
        href={'https://www.dropbox.com/s/fhf04mvmuv4elkk/Crowdflation%20Inc.%20Deck.pdf?dl=0'} target={'_blank'}
        rel="noreferrer">here</a></p>
      <FAQ untitled={true}/>
      <Code untitled={true}/>
    </main>

  </div>
}

export default Submission
