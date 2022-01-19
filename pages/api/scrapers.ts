// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../lib/util/middleware'
import { countryCodesMap } from '../../data/countries'
import { v4 as uuidv4 } from 'uuid';

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

type CSSIndex = [string, number];

type SimpleCSSScraper = {
  name:string;
  country: string;
  urlRegex:RegExp;
  itemSelector:string;
  parsers: Record<string,CSSIndex>;
  requiredFields:string[];
  copyFields:Record<string,string>
};

//TODO: Validation and assigning to a user
import { connectToDatabase } from "../../lib/util/mongodb";

export async function handleDataRequest(req: NextApiRequest, res: NextApiResponse<any>) {
  const {db} = await connectToDatabase();
  const collection = '_scrapers';
  //TODO: put methods in constants
  if (req.method === 'GET') {
    const scrapers = await db
        .collection('_scrapers')
        .find()
        .toArray();
    return res.status(200).json(JSON.stringify(scrapers, null, 2));
  } else if (req.method === 'POST') {
    const item = req.body;
    console.log('item', item);
    const {scraper}: {scraper:SimpleCSSScraper} = item;

    if(!countryCodesMap[scraper.country]) {
      throw new Error(`Country code provided was not found ${scraper.country}`);
    }

    const filter = _.pick(item, ['name', 'website', 'walletAddress']);

    const found = await db
        .collection(collection).findOne(filter);

    console.log('found', found);
    if (!found) {
      await db.collection(collection).insertOne({...item, added: new Date(), uuid: uuidv4()});
    } else {
      // TODO: Check signatures
      throw new Error('Updating is not currently implemented');
      // console.log('updating', found, item);
      // await db.collection(collection).updateOne(filter, {$set: item});
    }
    return res.status(200).json({});
  }

  throw new Error('Invalid request type');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  try {
    return await handleDataRequest(req, res);
  } catch (err) {
    return res.status(400).json({message:err && (err as any).toString()});
  }

};