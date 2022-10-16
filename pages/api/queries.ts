import {NextApiRequest, NextApiResponse} from "next";
import {runMiddleware} from "../../lib/util/middleware";
import _ from "lodash";
import Cors from "cors";
import {connectToDatabase} from "../../lib/util/mongodb";

const cors = Cors({
    methods: ['GET'],
});

function escapeRegExp(text) {
    if(!text) {
        return text;
    }
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function getQueries(query) {
    const algorithmVersion = '1.0.0';

    const {country, category, longitude, latitude, distance, age, vendor, searchText} = query;

    const queriesCollection = '_queries';
    const {db} = await connectToDatabase();
    const filter = {
        country,
        category,
        longitude,
        latitude,
        distance,
        age: parseInt(age as string) || undefined,
        vendor,
        searchText: {$regex: escapeRegExp(_.trim(searchText as string)), '$options' : 'i'},
        algorithmVersion
    };
    let results = await db.collection(queriesCollection).find(filter).sort({count: -1}).limit(10).toArray();

    results = results.map((q)=>q.searchText);
    console.log('RESULTS', filter, results);
    return results;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    // Run the middleware
    await runMiddleware(req, res, cors);
    const results = await getQueries(req.query);
    return res.status(200).json(JSON.stringify(results, null, 2));
}