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

//TODO: Validation and assigning to a user
import { connectToDatabase } from "../../lib/util/mongodb";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {

  // Run the middleware
  await runMiddleware(req, res, cors)

  const {db} = await connectToDatabase();
  //TODO: put methods in constants
  if(req.method === 'GET') {
    const prices = await db
    //TODO: put shops in db or constants
      .collection("walmart")
      .find({})
      .limit(10)
      .toArray();
    //TODO: put status code in constants
    return res.status(200).json(prices);
  } else if(req.method === 'POST') {
    const prices = await db
      .collection("walmart").insertMany(req.body);
    return res.status(200).json({});
  }
  return res.status(404).json({message:'Invalid request type'});
};