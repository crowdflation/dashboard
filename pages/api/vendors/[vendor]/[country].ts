// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../../../lib/util/middleware'
import { countries, countryCodes, countryCodesMap } from '../../../../data/countries'
import { countryToLanguage } from '../../../../data/languages'

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

function validateAndDenormalise(location:{latitude:number,longitude:number }) {
  const dateTime = new Date();
  //Round to hours so we can combine data
  dateTime.setMinutes(0, 0, 0);

  //Make location rought so that we can combine results
  //TODO: use kilomoters for roughtness and check with Ekon team how rought it should be
  const roughLocation = location?{latitude:parseFloat(location.latitude?.toString()).toFixed(3), longitude: parseFloat(location.longitude?.toString()).toFixed(3)}:null;
  return function(item:any) {
    if(!item.name || !item.price) {
      throw new Error('Submission data must have name and price fields');
    }
    return {...item, locationArray: [roughLocation?.longitude, roughLocation?.latitude], location: roughLocation, dateTime}
  }
}

//TODO: Validation and assigning to a user
import { connectToDatabase } from "../../../../lib/util/mongodb";
import axios from "axios";
import {cleanupPriceName} from "../../../../lib/util/utils";

function wait(delay) {
  return new Promise(function(succ) {
    setTimeout(succ, delay);
  });
}

async function getCategoriesFromModel(namesNotCategorised: string[], language) {
  if(!namesNotCategorised?.length) {
    return [];
  }
  const modelUrl = process.env.CATEGORISATOION_MODEL_URL as string;
  for (let i =0;i<=5;i++) {
    try {
      return (await axios.post(`${modelUrl}/ai-prediction`, {
        "product_list": namesNotCategorised,
        "lang": language.toLowerCase()
      })).data;
    } catch (ex) {
      console.warn('got error, waiting');
      await wait(5000);
    }
  }
  throw new Error("Timeout trying to access the model")
}

export async function handleDataRequest(vendor: string | string[], country: any, page: number=0, limit: number=200, req: NextApiRequest, res: NextApiResponse<any>) {
  if (!vendor || _.includes(vendor, '_')) {
    return res.status(400).json({error: 'Non-allowed vendor name'});
  }

  if (!country) {
    country = countries["United States"].code;
  }

  // @ts-ignore
  if (!countryCodesMap[country]) {
    return res.status(400).json({
      error: 'Country name not found, must be in the list of countryNames',
      countryNames: countryCodes
    });
  }

  let countryFilter: any = country;
  if (country === countries["United States"].code) {
    countryFilter = {$in: [country, null]};
  }

  let language = countryToLanguage[country];
  if(!language) {
    language = 'EN';
  }

  let languageFilter: any = language;
  if(language ==='EN') {
    languageFilter = {$in: [language, null]};
  }

  const {db} = await connectToDatabase();
  //TODO: put methods in constants
  if (req.method === 'GET') {

    let totalItems, totalPages, currentPage;

    //try {

      let prices = null;
      if (req.query.aggregate) {
        console.log('aggregate');
        let what = tryParse(req.query.aggregate, null);
        if (what) {
          prices = await db
              .collection(vendor)
              .aggregate(what)
              .toArray();
        }
      } else {
        const filter = {...tryParse(req.query.find, {}), country: countryFilter};
        const offset = page * limit;
        console.log('vendor',vendor, offset, limit);

        const count = await db
            .collection(vendor).find(filter).count();
        totalItems = count;
        totalPages = Math.ceil(count / limit);
        currentPage = page;

        //TODO: put shops in db or constants
        prices = await db
            .collection(vendor)
            .find(filter)
            .sort(tryParse(req.query.sort, {dateTime: -1}))
            .skip(offset)
            .limit(limit)
            .toArray();
      }

      //TODO: put status code in constants
      return res.status(200).json(JSON.stringify({totalItems, totalPages, currentPage, prices}, null, 2));
    /*} catch (e) {
      console.log('Error during get request handling',e, JSON.stringify(e, null, 2), (e as any).toString());
      return res.status(400).json({error: (e as any)?.toString()});
    }*/
  } else if (req.method === 'POST') {
    const enriched = req.body.payload.data.map(validateAndDenormalise(req.body.location));
    //Add each item from the list
    const namesFound = {};
    enriched.forEach(async function (item: any) {
      const itemFilter = {...item, country: countryFilter};
      const found = await db
          .collection(vendor).findOne(itemFilter);
      const cleanedUpName = cleanupPriceName(item.name);
      namesFound[cleanedUpName] = true;
      if (!found) {
        await db.collection(vendor).insertOne({...item, country});
      } else {
        //If item is found just increment the counter
        await db.collection(vendor).updateOne({...item, country: countryFilter}, {$inc: {count: 1}});
      }
    });

    await db.collection('_vendors').updateOne(
      {name: vendor, country: countryFilter},
      {$set: {name: vendor, country}},
      {
        upsert: true
      });

    res.status(200).json({});

    const namesNotCategorised:string[] = [];
    await Promise.all(Object.keys(namesFound).map(async (name)=> {
      const found = await db.collection('_categories').findOne({name, country: countryFilter, language: languageFilter});
      if(!found) {
        namesNotCategorised.push(name);
      }
    }));



    let categorised = await getCategoriesFromModel(namesNotCategorised, language);
    const confidenceThreshold = (parseFloat(process.env.CATEGORISATOION_CONFIDENCE_TRESHOLD as string)) || 0.8;


    let itemCategoriesUpdated = 0;
    await Promise.all(Object.keys(categorised).map(async (key)=> {
      const val = categorised[key];

      if(val?.confidence>confidenceThreshold) {
        const category = val?.prediction;
        if(category) {
          await db.collection('_categories').updateOne(
              {name: key, country: countryFilter},
              {$set: {name: key, category, country, language}},
              {
                upsert: true
              });
          itemCategoriesUpdated++;
        }
      }

    }));

    console.debug('itemCategoriesUpdated', itemCategoriesUpdated);
    return;
  }
  return res.status(404).json({message: 'Invalid request type'});
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {

  // Run the middleware
  await runMiddleware(req, res, cors);
  let { vendor, country, page, limit } = req.query;
  return await handleDataRequest(vendor as string, country,  (page as string | undefined) as (number | undefined), parseInt(limit as string), req, res);
};