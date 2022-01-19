// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../../../lib/util/middleware'
import { countries, countryCodes, countryCodesMap} from '../../../../data/countries'

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

function validateAndDenormalise(location:{latitude:number,longitude:number }) {
  const dateTime = new Date();
  //Round to hours so we can combine data
  dateTime.setMinutes(0, 0, 0);

  //Make location rought so that we can combine results
  //TODO: use kilomoters for roughtness and check with Ekon team how rought it should be
  const roughLocation = location?{latitude:parseFloat(location.latitude?.toString()).toFixed(3), longitude: parseFloat(location.longitude?.toString()).toFixed(3)}:null;
  return function(item:any) {
    if(!item.name || !item.price) {
      throw new Error('Submission data must have name and price fields');
    }
    return {...item, location: roughLocation, dateTime}
  }
}

//TODO: Validation and assigning to a user
import { connectToDatabase } from "../../../../lib/util/mongodb";

export async function handleDataRequest(vendor: string | string[], country: any, req: NextApiRequest, res: NextApiResponse<any>) {
  if (!vendor || _.includes(vendor, '_')) {
    return res.status(400).json({error: 'Non-allowed vendor name'});
  }

  if (!country) {
    country = countries["United States"].code;
  }

  // @ts-ignore
  if (!countryCodesMap[country]) {
    return res.status(400).json({
      error: 'Country name not found, must be in the list of countryNames',
      countryNames: countryCodes
    });
  }

  let countryFilter: any = country;
  if (country === countries["United States"].code) {
    countryFilter = {$in: [country, null]};
  }

  const {db} = await connectToDatabase();
  //TODO: put methods in constants
  if (req.method === 'GET') {
    console.log('query', req.query);

    try {
      let prices = null;
      if (req.query.aggregate) {
        let what = tryParse(req.query.aggregate, null);
        if (what) {
          prices = await db
              //TODO: put shops in db or constants
              .collection(vendor)
              .aggregate(what)
              .toArray();
        }
      } else {
        const filter = {...tryParse(req.query.find, {}), country: countryFilter};
        console.log('filter', filter);
        prices = await db
            //TODO: put shops in db or constants
            .collection(vendor)
            .find(filter)
            .sort(tryParse(req.query.sort, {dateTime: -1}))
            .toArray();
      }

      //TODO: put status code in constants
      return res.status(200).json(JSON.stringify(prices, null, 2));
    } catch (e) {
      console.log(JSON.stringify(e, null, 2), (e as any).toString());
      return res.status(400).json({error: (e as any)?.toString()});
    }
  } else if (req.method === 'POST') {
    const enriched = req.body.payload.data.map(validateAndDenormalise(req.body.location));
    //Add each item from the list
    enriched.forEach(async function (item: any) {
      const itemFilter = {...item, country: countryFilter};
      console.log('itemFilter', itemFilter );
      const found = await db
          .collection(vendor).findOne(itemFilter);
      console.log('found', found);
      if (!found) {
        await db.collection(vendor).insertOne({...item, country});
      } else {
        //If item is found just increment the counter
        await db.collection(vendor).updateOne({...item, country: countryFilter}, {$inc: {count: 1}});
      }
    });

    await db.collection('_vendors').updateOne(
        {name: vendor, country: countryFilter},
        {$set: {name: vendor, country}},
        {
          upsert: true
        });

    return res.status(200).json({});
  }
  return res.status(404).json({message: 'Invalid request type'});
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {

  // Run the middleware
  await runMiddleware(req, res, cors);
  let { vendor, country } = req.query;
  return await handleDataRequest(vendor, country, req, res);
};