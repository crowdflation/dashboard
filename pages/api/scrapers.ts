// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import {NextApiRequest, NextApiResponse} from 'next'
import Cors from 'cors'
import _ from 'lodash';
import {runMiddleware} from '../../lib/util/middleware'
import {countryCodesMap} from '../../data/countries'
import {v4 as uuidv4} from 'uuid';
import psl from 'psl';
import * as toi from "@toi/toi";
import {ValidationError} from "@toi/toi";
import * as toix from "@toi/toix";
//TODO: Validation and assigning to a user
import {connectToDatabase} from "../../lib/util/mongodb";


const isScraper = toi
    .required() // make toi reject null or undefined
    .and(toi.obj.isplain()) // forces that the value is a plain JS object
    .and(
        toi.obj.keys(
            {
              website: toix.str.url(),
              walletAddress: toi.str.regex(/^0x[a-fA-F0-9]{40}$/),
              scraper: toi
                  .required() // make toi reject null or undefined
                  .and(toi.obj.isplain()) // forces that the value is a plain JS object
                  .and(
                      toi.obj.keys(
                          {
                            name: toi.str.min(5).and(toi.str.max(100)).and(toi.required()),
                            country: toi.str.min(2).and(toi.str.max(2)).and(toi.required()),
                            urlRegex: toi.str.min(5).and(toi.str.max(100)).and(toix.str.startsWith('/')).and(toix.str.endsWith('/')).and(toi.required()),
                            itemSelector: toi.str.min(5).and(toi.str.max(250)).and(toi.required()),
                            parsers: toi.required().and(toi.obj.isplain()),
                            requiredFields: toi.array.is().and(toi.array.max(100)).and(toi.array.min(2)).and(toi.array.items(toi.str.is())),
                            copyFields: toi.required().and(toi.obj.isplain()),
                          }))}));


function extractHostname(url) {
  let hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("//") > -1) {
    hostname = url.split('/')[2];
  }
  else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}


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

export async function getScrapers(db) {
  return await db
      .collection('_scrapers')
      .find({type: 'simple-css'})
      .toArray();
}

export async function handleDataRequest(req: NextApiRequest, res: NextApiResponse<any>) {
  const {db} = await connectToDatabase();
  const collection = '_scrapers';
  //TODO: put methods in constants
  if (req.method === 'GET') {
    const scrapers = await getScrapers(db);
    return res.status(200).json(JSON.stringify(scrapers, null, 2));
  } else if (req.method === 'POST') {
    const item = req.body;
    isScraper(item);

    if(item.scraper.name.startsWith('_')) {
      throw new Error(`Name cannot start with "_"`);
    }

    console.log('item', item);
    const {scraper}: {scraper:SimpleCSSScraper} = item;

    if(!countryCodesMap[scraper.country]) {
      throw new Error(`Country code provided was not found ${scraper.country}`);
    }


    const hostname = extractHostname(item.website);
    console.log('hostname', hostname);
    const domain = psl.get(hostname).toLowerCase();
    const filterDifferentName = { domain, name: { $ne: item.name } };


    let foundDifferentName;

    //Check if we already have similar scraper with different domain
    try {
      foundDifferentName = await db
          .collection(collection).findOne(filterDifferentName);
    } catch (e) {}
    if (foundDifferentName) {
      throw new Error(`Item with the same domain name ${domain} but different scraper name has been found ${foundDifferentName.name}. Please use the same name for the same vendor, to help with price comparison`);
    }

    const filter = {..._.pick(item, ['name', 'website', 'walletAddress']), type:'simple-css'};

    //TODO:find by contents hash
    const found = await db
        .collection(collection).findOne(filter);

    console.log('found', found);
    if (!found) {
      await db.collection(collection).insertOne({...item, added: new Date(), uuid: uuidv4(), domain, type:'simple-css'});
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

const explainReasons = (reasons) => {
  let response = '';
  _.mapValues(reasons, (key, val) => {
    console.log('keyval', key, val, reasons[key]);
    response+= `${key} = ${val}`;
    if((val as any).reasons) {
      response += explainReasons((val as any).reasons);
    }
  });
  return response;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  try {
    return await handleDataRequest(req, res);
  } catch(err) {
    if(err instanceof ValidationError) {
      const verr = err as ValidationError;
      console.log('verr', verr);
      return res.status(400).json({message: `Validation error - ${explainReasons(verr.reasons)}`});
    } else {
      console.log('err', err);
      return res.status(400).json({message:err && (err as any).toString()});
    }
  }

};