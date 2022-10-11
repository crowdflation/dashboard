// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../lib/util/middleware'

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});


function validateAndDenormalise(details) {
  const dateTime = new Date();
  //Make location rought so that we can combine results
  return function(item:any) {
    return {...item, details, dateTime}
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
    console.log('query', req.query);

    try {
      const errors = await db
      //TODO: put shops in db or constants
        .collection('_errors')
        .find(tryParse(req.query.find, {}))
        .sort(tryParse(req.query.sort, {dateTime: -1}))
        .limit(tryParse(req.query.limit, 100))
        .toArray();
      return res.status(200).json(JSON.stringify(errors.map(e=>_.omit(e,['ip'])), null, 2));
    } catch(e) {
      console.log(JSON.stringify(e, null, 2), (e as any).toString());
      return res.status(400).json({error: e?.toString()});
    }
  } else if(req.method === 'POST') {

    if(!req.body.errors) {
      return res.status(400).json({message:'should contain errors object'});
    }

    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress

    const enriched = req.body.errors.map(validateAndDenormalise({ ...req.body.details, ip}));

    //Add each item from the list
    enriched.forEach(async function(item:any) {
      await db.collection('_errors').insertOne(item);
    });

    return res.status(200).json({});
  }
  return res.status(404).json({message:'Invalid request type'});
}