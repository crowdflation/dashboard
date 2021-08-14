// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

function validateAndDenormalise(location:{latitude:number,longitude:number }) {
  const dateTime = new Date();
  //Round to hours so we can combine data
  dateTime.setMinutes(0, 0, 0);

  //Make location rought so that we can combine results
  //TODO: use kilomoters for roughtness and check with Ekon team how rought it should be
  const roughLocation = location?{latitude:parseFloat(location.latitude?.toString()).toFixed(3), longitude: parseFloat(location.longitude?.toString()).toFixed(3)}:null;
  return function(item:any) {
    return {...item, location: roughLocation, dateTime}
  }
}


//TODO: Validation and assigning to a user
import { connectToDatabase } from "../../lib/util/mongodb";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {

  // Run the middleware
  await runMiddleware(req, res, cors);

  const {db} = await connectToDatabase();
  //TODO: put methods in constants
  if(req.method === 'GET') {
    const prices = await db
    //TODO: put shops in db or constants
      .collection("walmart")
      .find({})
      .sort({dateTime:-1})
      .limit(10)
      .toArray();
    //TODO: put status code in constants
    return res.status(200).json(prices);
  } else if(req.method === 'POST') {
    const enriched = req.body.data.map(validateAndDenormalise(req.body.location));
    //Add each item from the list
    enriched.forEach(async function(item:any) {
      const found = await db
        .collection("walmart").findOne(item);
      console.log('found', found);
      if(!found) {
        await db.collection("walmart").insertOne(item);
      } else {
        //If item is found just increment the counter
        await db.collection("walmart").updateOne(item, {$inc: {count: 1}});
      }
    });

    return res.status(200).json({});
  }
  return res.status(404).json({message:'Invalid request type'});
};