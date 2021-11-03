import {NextPage} from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import FAQ from "./faq";
import Inflation from "./inflation";
import {calculateInflation} from "./api/inflation";


export async function getServerSideProps() {
  const resultObject = await calculateInflation({});
  const apiKey: string = (process.env as any).GOOGLE_MAPS_API_KEY as string;
  console.log('apiKey', apiKey);
  return {
    props: {resultObject, apiKey}, // will be passed to the page component as props
  }
}

const Submission: NextPage = (props) => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Crowdflation Inc - Submission for the 1729 Inflation Dashboard Challenge</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Crowdflation Inc submission for the 1729 Inflation Dashboard challenge.
        </h1>

        <h2>The following video introduces our approach</h2>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/AidIdovi7ok" title="Crowdflation Community"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen></iframe>

        <h2>
          You can check out our presentation <a href={'https://www.dropbox.com/s/fhf04mvmuv4elkk/Crowdflation%20Inc.%20Deck.pdf?dl=0'} target={'_blank'} rel="noreferrer">here</a>
        </h2>
        <FAQ/>
        <h1 className={styles.title}>
          Inflation Calculation
        </h1>
        <Inflation {...props}/>
      </main>

    </div>
  )
}

export default Submission
