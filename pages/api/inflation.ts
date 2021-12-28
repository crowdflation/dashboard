import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../lib/util/middleware';
import { getPrevDay, getDates, formatDate } from '../../lib/util/dates';
import { sha256 } from 'js-sha256';
import Cors from 'cors';
import categoriesMap from '../../data/map';


// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

function getFloat(str) {
  const regex = /[+-]?\d+(\.\d+)?/g;
  const parsed = str?.match(regex);
  if(!parsed || !parsed[0]) {
    return null;
  }
  return parseFloat(parsed[0]);
}

function getCategory(vendor, name, categoryByProduct) {
  if(categoryByProduct[name]) {
    return categoryByProduct[name];
  }
  switch (vendor) {
    case 'walmart': return 'Food and beverages';
    case 'kroger': return 'Food and beverages';
    case 'zillow': return 'Housing';
  }
}

function getCategoryCPIWeight(category, vendor, which) {
  category = _.trim(category);
  if(categoriesMap[category]) {
    return categoriesMap[category][which];
  }
  switch (category) {
    case 'Food and beverages': return 15.157;
    case 'Housing': return 42.385;
  }
}

//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
function calcCrow(lat11, lon11, lat22, lon22)
{
  var R = 6371; // km
  var dLat = toRad(lat22-lat11);
  var dLon = toRad(lon22-lon11);
  var lat1 = toRad(lat11);
  var lat2 = toRad(lat22);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  return d;
}

// Converts numeric degrees to radians
function toRad(Value): number
{
  return Value * Math.PI / 180;
}



function findParent(name, where) {
  if(where[name]) {
    return true;
  }

  if(!categoriesMap[name]) {
    return false;
  }

  if(categoriesMap[name].parent) {
    return findParent(categoriesMap[name].parent, where);
  }
  return false;
}

function findPrevPrice(i, pricesByDate, dates, key, productPrices, pricesByCategory, categoryByProduct, categoriesLimitObject) {
  for (let p = i - 1; p >= 0; p--) {

    const prev = pricesByDate[dates[p]];
    if (!prev || !prev[key] || !productPrices[0] || !productPrices[0].vendor) {
      continue;
    }

    const currPricesMean = _.mean(productPrices.map((i) => i.price));
    const prevPricesMean = _.mean(prev[key].map((i) => i.price));

    const category = getCategory(productPrices[0].vendor, productPrices[0].name, categoryByProduct) as string;

    // console.log('category', category, productPrices[0].name);
    if (categoriesLimitObject && !findParent(category, categoriesLimitObject)) {
      // console.log('Ignoring');
      return;
    }

    if (!pricesByCategory[category]) {
      pricesByCategory[category] = [];
    }

    pricesByCategory[category].push({currPricesMean, prevPricesMean});
    return;
  }
}

async function storePricesByDate(prices, latitude, longitude, distanceMiles: any, pricesByDate, vendor) {
  prices.forEach((price) => {
    if (latitude && longitude && distanceMiles) {
      //Skip item with no location data
      if (!price.longitude || !price.latitude) {
        return;
      } else {
        const distanceCalculated = calcCrow(price.latitude, price.longitude, latitude, longitude);
        if (distanceCalculated > distanceMiles) {
          //Measurement too far away
          return;
        }
      }
    }

    const priceDate = formatDate(price.dateTime);
    if (!pricesByDate[priceDate]) {
      pricesByDate[priceDate] = {};
    }

    const productKey = vendor + '-' + price.name;
    if (!pricesByDate[priceDate][productKey]) {
      pricesByDate[priceDate][productKey] = [];
    }

    const priceFloat = getFloat(price.price);
    if (!priceFloat) {
      return;
    }

    pricesByDate[priceDate][productKey].push({vendor, name: price.name, price: priceFloat});
  });
  return;
}

export async function calculateInflation(query) {
  const {db} = await connectToDatabase();

  var d = new Date();
  d.setMonth(d.getMonth() - 1);

  const from = tryParse(query.from, d);
  const algorithmVersion = 1;
  const cacheCollection = '_cacheInflationResults';
  const prevDay = getPrevDay(new Date());
  let to = tryParse(query.to, prevDay);

  // console.log('from, to', from, to);

  if(to>=prevDay) {
    to = prevDay;
    query.to = formatDate(to);
  }

  const dates = getDates(from, to);
  if (dates.length <= 1) {
    throw new Error(`Dates range should contain at least 2 days, got ${from} ${to}`);
  }

  const maxDates = process.env.MAX_DATES_CALCULATION || 90;

  if (dates.length > maxDates) {
    throw new Error(`Dates range should contain no more than ${maxDates} days, but it contains ${dates.length}`);
  }

  // TODO: caching by each item as well as whole query
  // TODO: cache by default values, not just query
  const queryHash = sha256(JSON.stringify(query));

  const cacheDisabled = process.env.CACHE_DISABLED || false;


  if(!cacheDisabled) {
    const result = await db.collection(cacheCollection)
      .findOne({queryHash, algorithmVersion});

    if (result) {
      return result.dataObj;
    }
  }

  const latitude = tryParse(query.lat, null);
  const longitude = tryParse(query.lng, null);
  let type = query.type;
  if(type!=='cpiu' && type!=='cpiw') {
    type = 'cpiu';
  }

  let distance = tryParse(query.radius, null);
  const categoriesLimit = tryParse(query.basket, null);

  let distanceMiles: any = null;

  if(distance && distance<1900) {
    distanceMiles = distance / 1.60934;
  } else {
    distance = null;
  }

  let vendors = await db.collection('_vendors').find().toArray();
  vendors = vendors.map(v => v.name);
  vendors = _.union(vendors, ['walmart', 'kroger', 'zillow']);

  let categories = await db.collection('_categories').find().toArray();
  let categoryByProduct = {};
  categories.reduce((r, item) => {
    categoryByProduct[item.name] = item.category;
  }, {});


  let categoriesLimitObject:any = null;
  if(categoriesLimit && categoriesLimit.length) {
    categoriesLimitObject = {};
    for(const c in categoriesLimit) {
      categoriesLimitObject[categoriesLimit[c]] = true;
    }
  }

  // console.log('categoriesLimitObject', categoriesLimitObject, categoriesLimit, query.basket);

  // Make a map for accessing prices by date and product/vendor
  const pricesByDate = {};

  await Promise.all(vendors.map(async (vendor) => {
    let prices = await db
      .collection(vendor)
      .find({dateTime: {$gte: from, $lt: to}})
      .toArray();

    // console.log('prices', prices.length);

    await storePricesByDate(prices, latitude, longitude, distanceMiles, pricesByDate, vendor);
  }));


  // console.log('pricesByDate', pricesByDate);

  const inflationInDayPercent = {};

  for (let i = dates.length - 1; i >= 1; i--) {
    const current = pricesByDate[dates[i]];
    const pricesByCategory = {};
    // console.log('prices', current);
    _.map(current, (productPrices, key) => {
      //Product not found
      findPrevPrice(i, pricesByDate, dates, key, productPrices, pricesByCategory, categoryByProduct, categoriesLimitObject);
    });

    // console.log('pricesByCategory', pricesByCategory);

    let totalInflation = 0;

    _.map(pricesByCategory, (prices: any[], category) => {
      const currPrices = _.mean(prices.map(p => p.currPricesMean));
      const prevPrices = _.mean(prices.map(p => p.prevPricesMean));
      //// console.log('Curr, prev', currPrices, prevPrices, prices);

      if (!prevPrices) {
        return;
      }

      const inflationChange = 1 - (prevPrices / currPrices);
      const inflationCategoryImportance = getCategoryCPIWeight(category, current.vendor, type) as number / 100;
      const inflationChangeByImportance = inflationChange * inflationCategoryImportance;
      //// console.log('inflationChangeByImportance', currPrices, prevPrices, inflationChange, inflationCategoryImportance, inflationChangeByImportance, totalInflation);
      totalInflation += inflationChangeByImportance;
      //// console.log(totalInflation);
    });


    const rounded = Math.round((totalInflation * 10000)) / 100;

    //// console.log(totalInflation, rounded);

    inflationInDayPercent[dates[i]] = rounded;
  }

  const dataObj = {
    inflationInDayPercent,
    from: dates[0],
    to: dates[dates.length - 1],
    country: 'US',
    lat: latitude,
    lng: longitude,
    radius: distance,
    basket: categoriesLimit,
    inflationOnLastDay: inflationInDayPercent[dates[dates.length - 1]],
    type
  };

  db.collection(cacheCollection).insertOne({queryHash, algorithmVersion, dataObj}).catch((ex) => {
    console.error('Failed to cache item for query', query);
  });

  return dataObj;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);
  const dataObj = await calculateInflation(req.query);

  return res.status(200).json(JSON.stringify(dataObj, null, 2));
}