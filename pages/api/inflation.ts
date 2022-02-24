import {connectToDatabase, getVendorNames} from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import _ from 'lodash';
import {runMiddleware, tryParse} from '../../lib/util/middleware';
import {formatDate, getIntervalRangeArray, getNextPeriod, periods} from '../../lib/util/dates';
import {sha256} from 'js-sha256';
import Cors from 'cors';
import categoriesMap from '../../data/map';
import {countries, countryCodes, countryCodesMap} from "../../data/countries";


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
  const R = 6371; // km
  const dLat = toRad(lat22 - lat11);
  const dLon = toRad(lon22 - lon11);
  const lat1 = toRad(lat11);
  const lat2 = toRad(lat22);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

function findPrevPrice(i, pricesByDate, dates, key, productPrices, pricesByCategory, categoryByProduct, categoriesLimitObject, explanationByDay) {
  for (let p = i - 1; p >= 0; p--) {

    const prev = pricesByDate[dates[p]];
    if (!prev || !prev[key] || !productPrices[0] || !productPrices[0].vendor) {
      continue;
    }

    const currPricesMean = _.mean(productPrices.map((i) => i.price));
    const prevPricesMean = _.mean(prev[key].map((i) => i.price));

    const category = getCategory(productPrices[0].vendor, productPrices[0].name, categoryByProduct) as string;
    if (categoriesLimitObject && !findParent(category, categoriesLimitObject)) {
      return;
    }

    noteExplanation(explanationByDay,dates[i], `Found previous prices for category ${category} on date ${dates[p]} with vendor ${productPrices[0].vendor} on product ${productPrices[0].name}`);
    noteExplanation(explanationByDay,dates[i], `Previous prices for category = ${prev[key].map(p=>p.price).join(',')}, taking mean as: ${prevPricesMean}`);
    noteExplanation(explanationByDay,dates[i], `Current prices for category = ${productPrices.map(p=>p.price).join(',')}, taking mean as: ${currPricesMean}`);

    if (!pricesByCategory[category]) {
      pricesByCategory[category] = [];
    }

    pricesByCategory[category].push({currPricesMean, prevPricesMean});
    return;
  }
}

async function storePricesByDate(prices, latitude, longitude, distanceMiles: any, pricesByDate, vendor, period) {
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

    const priceDate = formatDate(price.dateTime, period);
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

function noteExplanation(explanationByDate, date, explanation) {
  if(!explanationByDate[date]) {
    explanationByDate[date] = [];
  }
  explanationByDate[date].push(explanation);
}

export async function calculateInflation(db, query) {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);

  const period = query.period || 'Daily';

  if(!periods[period]) {
    throw new Error('Unknown period, should be either:' + Object.keys(periods).join(','));
  }

  const from = tryParse(query.from, d);
  const explain = tryParse(query.explain, false);
  const algorithmVersion = 1;
  const cacheCollection = '_cacheInflationResults';
  const prevDay = getNextPeriod(new Date(), period);
  let to = tryParse(query.to, prevDay);

  if(to>=prevDay) {
    to = prevDay;
    query.to = formatDate(to, period);
  }

  const dates = getIntervalRangeArray(from, to, period);
  if (dates.length <= 1) {
    throw new Error(`Date/Time range should contain at least 2 periods, got ${from} ${to}`);
  }


  let country = query.country;

  //TODO: deduplicate country validation
  if (!country) {
    country = countries["United States"].code;
  }

  // @ts-ignore
  if (!countryCodesMap[country]) {
    throw new Error('Country name not found, must be in the list of countryNames, should be one of the following:' + JSON.stringify(countryCodes));
  }

  let countryFilter: any = country;
  if (country === countries["United States"].code) {
    countryFilter = {$in: [country, null]};
  }

  const maxDates = process.env.MAX_DATES_CALCULATION || 90;

  if (dates.length > maxDates) {
    throw new Error(`Date/Time range should contain no more than ${maxDates} periods, but it contains ${dates.length}. Please choose a shorter period or reduce the frequency`);
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

  let vendors = await getVendorNames(db, {country: countryFilter});

  if(query.vendors) {
    const queryVendors = tryParse(query.vendors, null);
    if(queryVendors) {
      if(queryVendors.indexOf('All vendors')===-1) {
        let newVendors = queryVendors.filter(v => vendors.indexOf(v) !== -1);
        if (newVendors.length <= 0) {
          throw new Error('None of the Vendors provided do not match what is in the database');
        }

        vendors = newVendors;
      }
    }
  }


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
  // Make a map for accessing prices by date and product/vendor
  const pricesByDate = {};

  await Promise.all(vendors.map(async (vendor) => {
    let prices = await db
      .collection(vendor)
      .find({country: countryFilter, dateTime: {$gte: from, $lt: to}})
      .toArray();

    await storePricesByDate(prices, latitude, longitude, distanceMiles, pricesByDate, vendor, period);
  }));

  const inflationInDayPercent = {};
  const explanationByDay = {};

  for (let i = dates.length - 1; i >= 1; i--) {
    const current = pricesByDate[dates[i]];
    const pricesByCategory = {};
    _.map(current, (productPrices, key) => {
      //Product not found
      findPrevPrice(i, pricesByDate, dates, key, productPrices, pricesByCategory, categoryByProduct, categoriesLimitObject, explanationByDay);
    });
    let totalInflation = 0;

    _.map(pricesByCategory, (prices: any[], category) => {
      const currPrices = _.mean(prices.map(p => p.currPricesMean));
      const prevPrices = _.mean(prices.map(p => p.prevPricesMean));

      if (!prevPrices) {
        return;
      }

      const inflationChange = 1 - (prevPrices / currPrices);
      noteExplanation(explanationByDay,dates[i], `Checking category ${category}`);
      noteExplanation(explanationByDay,dates[i], `Previous prices ${prices.map(p => p.prevPricesMean).join(',')}, mean all products = ${prevPrices}`);
      noteExplanation(explanationByDay,dates[i], `Current prices ${prices.map(p => p.currPricesMean).join(',')} , mean all products = ${currPrices}`);
      noteExplanation(explanationByDay,dates[i], `We divide previous prices, by current prices to get the change of inflation for category ${category} and subtract it from 1 (100%) = ${inflationChange}`);
      const inflationCategoryImportance = getCategoryCPIWeight(category, current.vendor, type) as number / 100;
      const inflationChangeByImportance = inflationChange * inflationCategoryImportance;
      noteExplanation(explanationByDay,dates[i], `We multiply the result by inflation category importance for type of calculation ${type} ${category} = * ${inflationCategoryImportance}`);
      noteExplanation(explanationByDay,dates[i], `We get inflation for ${category} to be ${inflationChangeByImportance} which is added to total inflation so far ${totalInflation}`);
      totalInflation += inflationChangeByImportance;
    });

    noteExplanation(explanationByDay,dates[i], `Total inflation found = ${totalInflation}`);
    inflationInDayPercent[dates[i]] = Math.round((totalInflation * 10000)) / 100;
  }

  const dataObj = {
    inflationInDayPercent,
    from: dates[0],
    to: dates[dates.length - 1],
    country,
    lat: latitude,
    lng: longitude,
    radius: distance,
    basket: categoriesLimit,
    inflationOnLastDay: inflationInDayPercent[dates[dates.length - 1]],
    totalInflation: _.sum(Object.values(inflationInDayPercent)),
    period,
    type,
    vendors,
    explain,
    explanationByDay: explain?explanationByDay: null
  };

  db.collection(cacheCollection).insertOne({queryHash, algorithmVersion, dataObj}).catch((ex) => {
    console.error('Failed to cache item for query', query, ex.toString());
  });

  return dataObj;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the middleware
  await runMiddleware(req, res, cors);
  try {
    const {db} = await connectToDatabase();
    const dataObj = await calculateInflation(db, req.query);
    return res.status(200).json(JSON.stringify(dataObj, null, 2));
  } catch (err) {
    return res.status(400).json({message:err && (err as any).toString()});
  }
}