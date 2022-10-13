import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import { runMiddleware } from '../../lib/util/middleware';
import Cors from 'cors';
import categoriesMap from '../../data/map';
import {getPriceValue} from "../../lib/util/utils";
import _ from 'lodash';
const keywordExtractor = require("keyword-extractor");

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET'],
});

function categoryMatches(category, current) {
  if(!category) {
    return true;
  }
  if(current.value===category) {
    return true;
  }
  if(!current.parent) {
    return false;
  }

  return categoryMatches(category, categoriesMap[current.parent]);
}

function makeArrayRegex(search) {

  const arr= search.map((s)=>`(?=.*${s.toLowerCase()})`).join('');
  console.log('search', search, arr);
  return new RegExp(`^${arr}.*$`);
}


async function filterByCategories(category: string | string[], country: string | undefined, vendorName, ageInHours, db, search:string[], location, distance) {
  const categories = Object.keys(categoriesMap).filter((item) => {
    return categoryMatches(category, categoriesMap[item]);
  });

  const filter = {category: {$in: categories}};
  if (country) {
    if (country === 'US') {
      filter['$or'] = [{country: {$exists: false}}, {country}];
    } else {
      filter['country'] = country;
    }
  }

  if (vendorName) {
    filter['vendor'] = vendorName;
  }

  const timeOfRecordAge = new Date();
  if (ageInHours) {
    timeOfRecordAge.setHours(timeOfRecordAge.getHours() - ageInHours);
  }

  const searchRegexp = makeArrayRegex(search);


  const vendorNames = {};
  (await db.collection('_categories').find({...filter}).toArray()).forEach((cat) => {
    const vendor = cat.vendor;

    if (!vendor) {
      return;
    }

    if (search && !cat?.name.toLowerCase().match(searchRegexp)) {
      //console.log('does not', search, cat.name);
      return;
    } else {
      //console.log('yes', search, cat.name);
    }


    if (!vendorNames[vendor]) {
      vendorNames[vendor] = [];
    }
    vendorNames[vendor].push(cat.name);
  });

  const allProductData: any[] = [];

  await Promise.all(Object.keys(vendorNames).map(async (vendor) => {
    const foundProductNames = vendorNames[vendor];

    const productFilter = {name: {$in: foundProductNames}};

    if (location && distance) {
      productFilter['locationArray'] = {$geoWithin: {$centerSphere: [[parseFloat(location.longitude), parseFloat(location.latitude)], parseFloat(distance)]}};
    }

    if (ageInHours) {
      productFilter['dateTime'] = {$gt: timeOfRecordAge};
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

    const products = await db.collection(vendor).aggregate(catFilter).limit(200).toArray();
    return Promise.all(products.map(async (d) => {
      return allProductData.push({
        ...d,
        dateTime: d?.dateTime?.toString(),
        vendor,
        name: d._id,
        _id: allProductData.length + d._id,
        priceValue: getPriceValue(d.price)
      });
    }));
  }));
  return allProductData;
}

async function filterProducts(country: string | undefined, vendorName, ageInHours, db, search:string[], location, distance) {

  const vendorsFilter = {};
  if (country) {
    if (country === 'US') {
      vendorsFilter['$or'] = [{country: {$exists: false}}, {country}];
    } else {
      vendorsFilter['country'] = country;
    }
  }

  let vendors = [vendorName];

  if(!vendorName) {
    vendors = (await db.collection('_vendors').find(vendorsFilter).toArray()).map((v)=>v.name);
  }

  const filter = {};

  if (location && distance) {
    filter['locationArray'] = {$geoWithin: {$centerSphere: [[parseFloat(location.longitude), parseFloat(location.latitude)], parseFloat(distance)]}};
  }

  if (ageInHours) {
    const timeOfRecordAge = new Date();
    timeOfRecordAge.setHours(timeOfRecordAge.getHours() - ageInHours);
    filter['dateTime'] = {$gt: timeOfRecordAge};
  }

  if(search) {
    filter['name'] = {$regex : makeArrayRegex(search), '$options' : 'i'};
  }

  console.log('filter',filter);

  const allProductData:any[] = [];

  await Promise.all(vendors.map(async (vendor) => {

    const catFilter = [{
      $match: filter
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

    //console.log('catFilter',catFilter);

    const products = await db.collection(vendor).aggregate(catFilter).limit(200).toArray();
    console.log('products', vendor, products.length);
    try {
      products.forEach((d) => {
        allProductData.push({
          ...d,
          dateTime: d?.dateTime?.toString(),
          vendor,
          name: d._id,
          _id: allProductData.length + d._id,
          priceValue: getPriceValue(d.price)
        });
      });
    }
    catch (e) {
      console.error('Error saving', e);
    }
    return;
  }));

  console.log('app products',allProductData.length );

  return allProductData;

}

export async function getProducts(category:string, country: string|undefined, location, distance, vendorName, search:string, ageInHours) {
  const {db} = await connectToDatabase();
  const words = keywordExtractor.extract(search,{
    language:"english",
    remove_digits: false,
    return_changed_case:true,
    remove_duplicates: false
  });

  if(category) {
    return await filterByCategories(category, country?.toUpperCase(), vendorName, ageInHours, db, words, location, distance);
  }

  return await filterProducts(country?.toUpperCase(), vendorName, ageInHours, db, words, location, distance);

}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  try {
    if (req.method === 'GET') {
      const {country, category, longitude, latitude, distance, age, vendor, search} = req.query;
      const start = new Date();

      const ageInHours = parseInt(age as string) || undefined;

      const dataByVendor = await getProducts(category as string, country as string, {longitude, latitude}, distance, vendor, search?JSON.parse(search as string):search, ageInHours );

      console.log('Duration', (Math.abs( (new Date()).getTime() - start.getTime())/1000).toFixed(3));

      return res.status(200).json(JSON.stringify(dataByVendor, null, 2));
    }
  } catch(err) {
    console.error('err', err);
    return res.status(400).json({message:err && (err as any).toString()});
  }
}