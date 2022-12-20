import Document, { Html, Head, Main, NextScript } from 'next/document'

// Replace with the API key from your widget installation page
const USERSNAP_GLOBAL_API_KEY = '6eb9870f-70da-47c6-be24-13bae8f1b04d'

export default class MyDocument extends Document {
    render() {

        // @ts-ignore
        return (
            <Html lang="en">
                <Head>
                    <script async src="https://www.googletagmanager.com/gtag/js?id=G-GHHYQ1HDTJ"></script>
                    <script dangerouslySetInnerHTML={{
                        __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag() {
                            // @ts-ignore
                            if(window) {
                            // @ts-ignore
                                window.dataLayer.push(arguments);
                            }
                        }
                        gtag('js', new Date());

                        gtag('config', 'G-GHHYQ1HDTJ');`}}
                    />
                </Head>
                <script
                    async
                    src={`https://widget.usersnap.com/global/load/${USERSNAP_GLOBAL_API_KEY}?onload=onUsersnapCXLoad`}
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              window.onUsersnapCXLoad = function(api) {
                // store the Usersnap global api on the window, if case you want to use it in other contexts
                window.Usersnap = api; 
                api.init();
            }         
            `,
                    }}
                />
                <body>
                <Main />
                <NextScript />
                </body>
            </Html>
        )
    }
}