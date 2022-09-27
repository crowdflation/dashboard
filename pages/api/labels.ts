import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import { runMiddleware } from '../../lib/util/middleware';
import Cors from 'cors';
import {countryToLanguage} from "../../data/languages";

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  try {
    if (req.method === 'GET') {
      let {country, language} = req.query;
      let filter = {};
      if(!country) {
        country = 'US';
      }
      if(!language) {
        // @ts-ignore
        language = countryToLanguage[country];
        filter = {language};
      } else {
        filter = {country};
      }

      const {db} = await connectToDatabase();
      const foundLabels = await db.collection('_labels').aggregate([
          // Stage 1: Filter pizza order documents by pizza size
          {
            $match: filter
          },
          // Stage 2: Group remaining documents
          {
            $group: { _id: {
                category: "$category",
                name: "$name",
              }, total: { $sum : { $max: [ "$count", 1 ] } } }
          },
          // Stage 2: Group remaining documents
          {
            $group : {
              _id :  "$_id.name",
              categories: {
                $push: {
                  category:"$_id.category",
                  count:{ $sum : "$total" }
                }
              }
            }
          }]
      ).toArray();

      return res.status(200).json(JSON.stringify(foundLabels, null, 2));
    }
  } catch(err) {
    console.error('err', err);
    return res.status(400).json({message:err && (err as any).toString()});
  }
}