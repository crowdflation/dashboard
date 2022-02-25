import { NextPage } from 'next'
import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'


interface Untitlable {
    untitled: boolean | undefined;
}


const Contribute: NextPage<Untitlable> = (props:Untitlable) => {
    return (
        <div className={styles.container}>
            <Head>
                <title>Contribution - how to make more CRWD tokens</title>
            </Head>

            <main className={styles.main}>
                {!(props as any).untitled?(
                    < h1 className={styles.title}>
                        Contribution - how to make more CRWD tokens
                    </h1>):null
                }
                <div className={styles.description}>
                    <h3>
                        Data Labelling
                    </h3>
                    <p className={styles.description}>
                        You can label data in this <Link href={'/unlabelled'}>page</Link>. You will get rewards once your labels are being used.
                    </p>
                    <h3>
                        Adding new Scrapers
                    </h3>
                    <p className={styles.description}>
                        We mine data by using a browser extension. The browser extension is using scrapers. A scraper is an a method on how data can be extracted from a website. If you know <a href={"https://www.w3schools.com/css/"} target={"_blank"}>CSS</a> you can add scrapers in this <Link href={'/scrapers'}>page</Link>
                    </p>
                    <h3>
                        You can mine data
                    </h3>
                    <p className={styles.description}>
                        We mine data using a browser extension. This <a href={"https://docs.google.com/document/d/1Zg1YG3l65V7peDHPdZC5sDVNXa6cyq68bsowtcl0UoM/edit"} target={"_blank"}>document</a> describes how to install the browser extension. Once you navigate ot one of the websites that has scrapers the data collection should happen automatically. Make sure to have <a href={"https://metamask.io/"} target={"_blank"}>https://metamask.io/</a> installed to get rewards once this is set up.
                    </p>
                    <h3>
                        Being active in the Discord
                    </h3>
                    <div className={styles.description}>
                        If you are active in the <a href={"https://discord.gg/b6HrzTZ2tF"} target={"_blank"}>Discord</a>, this will be recognised with a number of rewards. We will note relevant posts with a custom icon and those will be rewarded once a tip bot is set up. Share if you done something rewarding and that will be noticed.
                    </div>
                </div>
            </main>
        </div>
    )
}

export default Contribute
