// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../../lib/util/middleware'

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
import { connectToDatabase } from "../../../lib/util/mongodb";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {

  // Run the middleware
  await runMiddleware(req, res, cors);
  const { vendor } = req.query;
  if(!vendor || _.includes(vendor, '_')) {
    return res.status(400).json({error: 'Non-allowed vendor name'});
  }

  const {db} = await connectToDatabase();
  //TODO: put methods in constants
  if(req.method === 'GET') {
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
        prices = await db
        //TODO: put shops in db or constants
          .collection(vendor)
          .find(tryParse(req.query.find, {}))
          .sort(tryParse(req.query.sort, {dateTime: -1}))
          .toArray();
      }

      //TODO: put status code in constants
      return res.status(200).json(JSON.stringify(prices, null, 2));
    } catch(e) {
      console.log(JSON.stringify(e, null, 2), e.toString());
      return res.status(400).json({error: e?.toString()});
    }
  } else if(req.method === 'POST') {
    const enriched = req.body.payload.data.map(validateAndDenormalise(req.body.location));
    //Add each item from the list
    enriched.forEach(async function(item:any) {
      const found = await db
        .collection(vendor).findOne(item);
      console.log('found', found);
      if(!found) {
        await db.collection(vendor).insertOne(item);
      } else {
        //If item is found just increment the counter
        await db.collection(vendor).updateOne(item, {$inc: {count: 1}});
      }
    });

    await db.collection('_vendors').updateOne(
      {name: vendor},
      { $set: {name: vendor}},
      {
        upsert: true
      });

    return res.status(200).json({});
  }
  return res.status(404).json({message:'Invalid request type'});
};