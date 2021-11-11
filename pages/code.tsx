import {NextPage} from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css';
import SyntaxHighlighter from 'react-syntax-highlighter';
//import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs/github';


const content = '\/\/ SPDX-License-Identifier:MIT\r\n\r\npragma solidity ^0.8.7;\r\n\r\nimport \"@chainlink\/contracts\/src\/v0.8\/ChainlinkClient.sol\";\r\n\r\ncontract CrowdflationChainlinkClient is ChainlinkClient {\r\n    using Chainlink for Chainlink.Request;\r\n    \r\n    int256 public lastDayValue;\r\n\r\n    address private oracle;\r\n    bytes32 private jobId;\r\n    uint256 private fee;\r\n\r\n    constructor() {\r\n        setPublicChainlinkToken();\r\n        oracle = 0xF405B99ACa8578B9eb989ee2b69D518aaDb90c1F; \/\/ LinkRiver Kovan Node\r\n        jobId = \"85de99690423441d956bcbbfd2a470cc\"; \/\/ https:\/\/market.link\/jobs\/d54a2562-741d-4e2e-b9c1-90eda0394f31\r\n        fee = 0.01 * 10 ** 18;      \/\/ (Depends on the node, network and job.)\r\n    }\r\n\r\n    function retrieveDataFromOracle() public returns(bytes32 requesId) {\r\n        Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);\r\n        request.add(\"get\", \"https:\/\/crowdflation.herokuapp.com\/api\/inflation\");\r\n        request.add(\"path\", \"inflationOnLastDay\");  \r\n        int timesAmount = 10**18;\r\n        request.addInt(\"times\", timesAmount);\r\n        return sendChainlinkRequestTo(oracle, request, fee);\r\n    }\r\n\r\n    function fulfill(bytes32 _requestId, int256 _lastDayValue) public recordChainlinkFulfillment(_requestId) {\r\n        lastDayValue = _lastDayValue;\r\n    }\r\n}';

interface Untitlable {
  untitled: boolean | undefined;
}


const Code: NextPage<Untitlable> = (props:Untitlable) => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Crowdflation - Crowdsourced Inflation Calculation Group Dashboard</title>
      </Head>

      <main className={styles.main}>
        {!(props as any).untitled ? (
          < h1 className={styles.title}>
            Crowdflation Dashboard Integration Code
          </h1>) : null
        }
        <div className={styles.description}>
          <h2 id="a-consumer-contract-example">A Consumer Contract Example</h2>
          <p>The following contract is an example of how you can, in a very simple way, bring data on-chain from our
            dashboard.
            We are showing this contract just as a demonstration of how data can be brought on-chain in a consumer
            contract.
            Please, refer to the note at the end of this page for a more detailed explanation about why this particular
            contract would not be the ultimate way we envision to bring inflation data reliably on-chain.</p>
          <SyntaxHighlighter language={'solidity'} className={styles.code} wrapLongLines={true}>
            {content}
          </SyntaxHighlighter>

          <h3 id="the-contract">The Contract</h3>
          <p>In the <code>constructor</code> function, we set the oracle address and the appropriate <em>jobId</em>, so
            that the chainlink protocol knows which node we want to send our request to, and additionally with
            the <em>jobId</em> we tell the node which job has to be run to carry out our request successfully.
            We also set the amount we have to pay to the oracle as a fee for processing our request. </p>
          <p>The <code>retrieveDataFromOracle</code> function is what actually builds the request and sends it out to the
            oracle. Inside this function: </p>
          <p>We first initialize the request itself, by passing the <em>jobId</em> and the address of the caller contract,
            which is our contract, the one we are using to perform the call to the oracle. Here we also pass
            the <code>fulfill</code> function, which is defined later in the contract. This function would be instead
            called by the oracle to know how and where to send the data it has previously retrieved.</p>
          <p>We then define what URL should be called to fetch the data, and how that data should be parsed before returning
            it back on-chain. To make sure the value we are operating with doesn&#39;t get rounded, we multiply it by a
            large number. </p>
          <p>The <code>fulfill</code> function would be used by the oracle as the way to pass the data it has retrieved off-chain to the contract
            on-chain - and in this case, to store the data in the <em>lastDayValue</em> variable. </p>
          <h2 id="more-info">More Information</h2>
          <p>For more information or additional tutorial, please refer to the Chainlink Documentation <a
            href="https://docs.chain.link" target={'_blank'} rel="noreferrer">page</a>, where you can also find a very similar <a
            href="https://docs.chain.link/docs/advanced-tutorial/" target={'_blank'} rel="noreferrer">example</a> to the one we just showed.</p>
          <h2 id="final-note">Final Note</h2>
          <p>
            As stated before, this example does not represent the ultimate way we imagine to bring accurate inflation
            data reliably on-chain.</p>
          <p>In this example, we make use of the <em>Basic Get Request Model</em> of the Chainlink protocol and we specifically
            point to our endpoint to fetch data from our database. </p>
          <p>In reality, what we are aiming to do is to bring on the blockchain a new <em>Chainlink Data Feed</em>, of
            which the inner mechanics would be quite different from this example.
            In fact, there would be a network of nodes that would independently fetch data off-chain (and in our case
            that would mean for each one of the nodes to fetch the data from their respective databases they have been
            maintaining themselves and populating over time thanks to the data crowdsourced by the users) and then the
            data from all the oracles would be aggregated and finally delivered on-chain to the consumer contract that is
            calling that <em>Data Feed</em>. </p>
        </div>

      </main>
    </div>
  )
}

export default Code
