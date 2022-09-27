import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import { runMiddleware } from '../../lib/util/middleware';
import Cors from 'cors';
import {countryToLanguage} from "../../data/languages";
import categoriesMap from '../../data/map';

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET'],
});

function categoryMatches(category, current) {
  if(current.value===category) {
    return true;
  }
  if(!current.parent) {
    return false;
  }

  return categoryMatches(category, categoriesMap[current.parent]);
}


export async function getProducts(category: string | string[]='All items', country: string | string[]='US', location, distance, vendorName, ageInHours) {
  const categories = Object.keys(categoriesMap).filter((item) => {
    return categoryMatches(category, categoriesMap[item]);
  });

  let filter = {category: {$in: categories}};
  if (!country || country==='US') {
    country = 'US';
    filter['$or'] = [{country: {$exists: false}}, {country}];
  } else {
    filter['country'] = country;
  }

  if(vendorName) {
    filter['vendor'] = vendorName;
  }

  const timeOfRecordAge = new Date();
  if(ageInHours) {
    timeOfRecordAge.setHours(timeOfRecordAge.getHours() - ageInHours);
  }

  const {db} = await connectToDatabase();

  const vendorNames = {};
  (await db.collection('_categories').find({...filter}).limit(200).toArray()).forEach((cat) => {
    const vendor = cat.vendor;
    if (!vendor) {
      return;
    }
    if (!vendorNames[vendor]) {
      vendorNames[vendor] = [];
    }
    vendorNames[vendor].push(cat.name);
  });

  const dataByVendor = {};


  const allProductData:any[] = [];
  console.log('vendorNames', vendorNames);

  await Promise.all(Object.keys(vendorNames).map(async (vendor) => {
    const foundProductNames = vendorNames[vendor];

    const productFilter = {name: {$in: foundProductNames}};

    if(location && distance) {
      productFilter['locationArray'] = { $geoWithin: { $centerSphere: [ [ location.longitude, location.latitude ], distance ] }};
    }

    if(ageInHours) {
      productFilter['dateTime'] = { $gt: timeOfRecordAge };
    }



    const catFilter = [{
      $match: productFilter
    },
      {
        $group: {
          _id: '$name',
          price: {
            $last: '$price'
          },
          date: {
            $last: '$dateTime'
          }
        }
      },
      {
        $project: {
          price: '$price',
          dateTime: '$date'
        }
      },
      {
        $sort: {
          "dateTime": -1
        }
      }];

    const products = await db.collection(vendor).aggregate(catFilter).toArray();
    return Promise.all(products.map( async(d)=> {
      return allProductData.push({
        ...d,
        dateTime: d?.dateTime?.toString(),
        vendor,
        name: d._id,
        _id: allProductData.length + d._id
      });
    }));
  }));
  return allProductData;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  try {
    if (req.method === 'GET') {
      let {country, category, longitude, latitude, distance, ageInHours, vendor} = req.query;

      const dataByVendor = await getProducts(category, country, {longitude, latitude}, distance, vendor, ageInHours );

      return res.status(200).json(JSON.stringify(dataByVendor, null, 2));
    }
  } catch(err) {
    console.error('err', err);
    return res.status(400).json({message:err && (err as any).toString()});
  }
}