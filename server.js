const next = require('next');
const express = require('express');
const sslRedirect = require('heroku-ssl-redirect').default; // to make it work with 'require' keyword.

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();


app.prepare().then(() => {
  const server = express();

  // Express's middleware to automatically redirect to 'https'.
  server.use(sslRedirect());

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, err => {
    if (err) throw err;

    console.log(`Server starts on ${port}.`);
  });
});