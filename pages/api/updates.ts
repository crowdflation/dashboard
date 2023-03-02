import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../lib/util/middleware';
import Cors from 'cors';
import categoriesMap from '../../data/map';

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});



export async function getLastUpdateFromScrapers() {
  const {db} = await connectToDatabase();

  const now = new Date();
  const from = new Date(now.setDate(now.getDate() - 1));
  const to = new Date();

  // find scrapers with automatic updates
  const scrapers = await db.collection('_scrapers').find({datasets: {$elemMatch:{ $exists: true }}}).toArray();
  return Promise.all(scrapers.map(async (scraper) => {
    const name = scraper.scraper.name;
    const lastUpdate = await db.collection(name).find({dateTime: {$gte: from, $lt: to}}).sort({dateTime: -1}).limit(1).toArray();
    const count = await db.collection(name).find({dateTime: {$gte: from, $lt: to}}).count();
    if(lastUpdate.length) {
      return {
        name: name,
        lastUpdate: lastUpdate[0].dateTime,
        result: 'hasRecords',
        count
      }
    } else {
      const reallyLastUpdate = await db.collection(name).find({}).sort({dateTime: -1}).limit(1).toArray();
      if(reallyLastUpdate.length) {
        return {
          name: name,
          lastUpdate: reallyLastUpdate[0].dateTime,
          result: 'outdatedRecords'
        }
      } else {
        return {
          name: name,
          lastUpdate: null,
          result: 'noRecords'
        }
      }
    }
  }));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {

  const {query} = req.query;
  // Run the middleware
  await runMiddleware(req, res, cors);
  const dataObj = await getLastUpdateFromScrapers();
  const containsSomeRecords = dataObj.some(d => d.result === 'hasRecords');
  const containsOutdatedRecords = dataObj.some(d => d.result === 'outdatedRecords');
  let statusCode = 200;
  switch (query) {
    case 'hasRecords':
        if(!containsSomeRecords) {
          statusCode = 404;
        }
        break;
    case 'noOutdatedRecords':
        if(containsOutdatedRecords) {
            statusCode = 404;
        }
  }

  return res.status(statusCode).send(JSON.stringify(dataObj, null, 2))
}