import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import { runMiddleware } from '../../lib/util/middleware';
import Cors from 'cors';
import categoriesMap from '../../data/map';
import {getPriceValue} from "../../lib/util/utils";
import _ from 'lodash';
import {sha256} from "js-sha256";

const blankHash = 'aa0a9f4a1136f9986a383cfa1040cfa81718c036d98dbc5dcde0c80e6a3632cd'

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

//FIXME: This function might be out of date
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
        $sort: {
          "dateTime": -1
        }
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
      }];

    const products = await db.collection(vendor).aggregate(catFilter).limit(5).toArray();
    return Promise.all(products.map(async (d) => {
      return allProductData.push({
        ...d,
        dateTime: d?.dateTime?.toISOString(),
        vendor,
        name: d._id,
        _id: allProductData.length + d._id,
        priceValue: getPriceValue(d.price)
      });
    }));
  }));

  await enrichProductImages(allProductData, db);
  return allProductData;
}


function combineNameAndVendor(name, vendor) {
  return `${name} ${vendor}`;
}

async function enrichProductImages(allProductData: any[], db) {
  // get images for products
  const imgHashes = allProductData.map((p) => p.name);
  const imgFilter = {name: {$in: imgHashes}};
  const images = await db.collection('_images').find(imgFilter).toArray();
  const imgHashToImg = {};
  images.forEach((i) => {
    if (i.imgHash !== blankHash) {
      imgHashToImg[combineNameAndVendor(i.name, i.vendor)] = i.imgHash;
    }
  });
  allProductData.forEach((p) => {
    if (!p.imgHash && imgHashToImg[combineNameAndVendor(p.name, p.vendor)]) {
      console.log('setting img hash', p.name, p.vendor, imgHashToImg[combineNameAndVendor(p.name, p.vendor)]);
      p.imgHash = imgHashToImg[combineNameAndVendor(p.name, p.vendor)];
    }
  });
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
    console.log('ageInHours', ageInHours, timeOfRecordAge.toISOString());
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
      $sort: {
        "dateTime": -1
      }
    },
    { $limit: 10 },
    {
      $group: {
        _id: '$name',
        price: {
          $last: '$price'
        },
        date: {
          $last: '$dateTime'
        },
        imgHash: {
          $last: '$imgHash'
        }
      }
    },
    {
      $project: {
        price: '$price',
        dateTime: '$date',
        imgHash: '$imgHash'
      }
    }];

    //console.log('catFilter',catFilter);

    const products = await db.collection(vendor).aggregate(catFilter).limit(5).toArray();
    console.log('products', vendor, products.length);
    try {
      products.forEach((d) => {
        allProductData.push({
          ...d,
          dateTime: d?.dateTime?.toISOString(),
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

  await enrichProductImages(allProductData, db);

  return allProductData;

}

function cacheQuery(searchText: string, db, params: { country: string | undefined; search: string[]; distance: any; location: any; category: string; vendorName: any; age: any }, algorithmVersion: string) {
  searchText = _.trim(searchText);

  if (searchText && searchText.length >= 5) {
    const queriesCollection = '_queries';
    db.collection(queriesCollection).updateOne({searchText}, {
      $set: {searchText, ...params, algorithmVersion},
      $inc: {count: 1}
    }, {
      upsert: true
    }).catch((ex) => {
      console.error('Failed to cache query', searchText, ex.toString());
    });
  }
}

export async function getProducts(category:string, country: string|undefined, location, distance, vendorName, search:string[], searchText:string, ageInHours) {
  const {db} = await connectToDatabase();

  const dateTime = new Date();
  //Round to hours so we can combine data
  dateTime.setMinutes(0, 0, 0);

  const params = {category, country, location, distance, vendorName, search, age:ageInHours};

  const queryHash = sha256(JSON.stringify({...params, dateTime}));
  const cacheDisabled = process.env.CACHE_DISABLED || false;

  const algorithmVersion = '1.0.0';



  const cacheCollection = '_cacheProducts';

  if(!cacheDisabled) {
    const result = await db.collection(cacheCollection)
        .findOne({queryHash, algorithmVersion});

    if (result) {
      return result.dataObj;
    }
  }

  let dataObj:any[];
  if(category) {
    dataObj = await filterByCategories(category, country?.toUpperCase(), vendorName, ageInHours, db, search, location, distance);
  } else {
    dataObj = await filterProducts(country?.toUpperCase(), vendorName, ageInHours, db, search, location, distance);
  }
  
  if(dataObj.length>0) {
    const metadata = await db.collection('_extracted').find({ name: { $in: dataObj.map((d)=>d.name)}/*, country*/}).toArray();

    const byName = {};
    metadata.forEach((m)=>byName[m.name]={...m});

    dataObj.forEach((d)=> {
      if(byName[d.name]) {
        delete byName[d.name].name;
        delete byName[d.name]._id;
        delete byName[d.name].country;
        delete byName[d.name].language;
        delete byName[d.name].vendor;
        d.metadata = byName[d.name];
      } else {
        d.metadata = {};
      }
    });

    db.collection(cacheCollection).insertOne({queryHash, algorithmVersion, dataObj}).catch((ex) => {
      console.error('Failed to cache item for query', ex.toString());
    });
    cacheQuery(searchText, db, params, algorithmVersion);
  }

  return dataObj;

}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  try {
    if (req.method === 'GET') {
      const {country, category, longitude, latitude, distance, age, vendor, search, searchText} = req.query;

      const ageInHours = parseInt(age as string) || undefined;

      const dataByVendor = await getProducts(category as string, country as string, {longitude, latitude}, distance, vendor, search?JSON.parse(search as string):search, searchText as string, ageInHours );

      return res.status(200).json(JSON.stringify(dataByVendor, null, 2));
    }
  } catch(err) {
    console.error('err', err);
    return res.status(400).json({message:err && (err as any).toString()});
  }
}