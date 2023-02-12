// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../../../lib/util/middleware'
import { countries, countryCodes, countryCodesMap } from '../../../../data/countries'
import { countryToLanguage } from '../../../../data/languages'
import { connectToDatabase } from "../../../../lib/util/mongodb";
import axios from "axios";
import {cleanupPriceName} from "../../../../lib/util/utils";
import {sha256} from "js-sha256";
import { Client } from 'elasticsearch';
const client = new Client({
  host: process.env.ELASTIC_SEARCH_URL,
  ssl:{ rejectUnauthorized: false, pfx: [] },
  //log: 'trace'
});

async function indexProvidedProduct(product, vendorName, country) {
  const productDocument = {
    name: product.name,
    vendor: vendorName,
    country: country || 'US',
    dateTime: product.dateTime,
    price: product.price
  };
  const id = `${vendorName}-${product.name}`;
  try {
    if(!product.name || !vendorName) {
        throw new Error(`Product must have name and vendor ${id}` );
    }

    // upsert the product if exists and update the dateTime
    await client.index({
      index: 'products',
      id,
      body: productDocument,
      refresh: true
    });
    console.log('indexed', id, product.dateTime);
  } catch (e) {
    console.log('Error indexing product', e, id, productDocument);
  }
}

// Require the cloudinary library
const cloudinary = require('cloudinary').v2;

// Return "https" URLs by setting secure: true
cloudinary.config({
  secure: true
});

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb' // Set desired value here
    }
  }
}

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


async function extractUnitsFromModel(namesNotExtracted: string[], language) {
  if(!namesNotExtracted?.length) {
    return [];
  }

  const modelUrl = process.env.UNIT_EXTRACTION_MODEL_URL as string;
  for (let i =0;i<=5;i++) {
    try {
      return (await axios.post(`${modelUrl}/extraction`, {
        "product_list": namesNotExtracted,
        "lang": language.toLowerCase()
      })).data;
    } catch (ex) {
      console.warn('got error, waiting', ex);
      await wait(5000);
    }
  }
  throw new Error("Timeout trying to access the model")
}

// fixme: use image size instead or better detection
const ignoreHashes = ["00cbd2f5b027d51cc10299a5f6b289a596b575d20de51dacb659394689bda6c4",
  "07478069299cbf2bef40b4a9b688ae5acced0507d42e7517fb42e9159c4c3219",
  "0dc362022df09090fcfe6cfa2c76b2ff7a7933a1d0d780ac599f77bbf25702bd",
  "1b748b46137a24d4eb3bd4dc8d0c6a25a56828126cbe79e5c3951aa0c65e27f3",
  "41113253d1bfbb6aef0459127af57a17056636ed415bf166e66c6682c0c36f76",
  "43deb15255abe3114458dea4321d98aec1d00b7271c4a93f0dc07013d1748e89",
  "4ae5a7e0e561e5b4f1b803a0ab3464b8b90a7442e46a9fc0aa12c430f4227878",
  "53e0a2b40392880cc4e006bf741b8359d30b846d3f4a918e07d959235a160d89",
  "567035580f90a4e58ac9c003bdb3378bfb1099cba2087d31be02f21d97631661",
  "75ae7298c996feb703e4d97791d2d6669c3fa1ec6020253d4f9890435dab4e4e",
  "7eea2b501c071e9b24054119500b45d0ea258bd4e6ecec1cc53c686fe8f66633",
  "87609592acab58787d04cd496977f73d35e3b1debfc43e2cbdd056327cf6b9e4",
  "8f6b75bb28295ec0eeee4a031e8ef1c83f765df61f08796ae0ba2aef09277440",
  "950acc29d6f1a48b7e45d92e0f183dd0714ee8095576aff709cbb817a44e238e",
  "a38d3ee7d11cd9356d4fab658b40cff46a11ee7d9b689356cab0946677275cea",
  "aa0a9f4a1136f9986a383cfa1040cfa81718c036d98dbc5dcde0c80e6a3632cd",
  "b692c543bb690fa8ea9c43c98f01b956772e8133623c5d0723be494c88e52d4b",
  "b735350a370e85a17ac6fd3f47972a51d7e535d19945aeef2f9bdb86ed7d199b",
  "be629491d505c15cb5c727fbf6a383f48b6eafdfa954767b3a86726fb788294a",
  "c198f4f027239c3042683ddff811623666e18e108fd2be0145e436d3a8ac4253",
  "c391dac8888052bf5f2cf49cc4ecb54a82418ca3d0a8eafdbc48ec9273fd7df6",
  "c8c2aa346c748d4e862472f2ff4a6727e418b46c614182447859005699efabce",
  "cba7ec4b68e9fb171bd043ae1ea1caeabca434ea50c60c4425cb2bedf84d5e56",
  "cf62e1ce268b679339ee13b6d43d9e3fa8035dea05ab175279a3c50166460f5d",
  "d01b16315fcd34fbd858d7a3914022f306c8ee59d779cb1424c0076a8353be38",
  "d5a5273ae8b1b00cc00ec0719d8c9c496173ff0e858c1a1d4ca85785cfa1338d",
  "defafd77cb993a107701af97d527ebe124512e8ec145539963ca61bfe2341bf4",
  "df4e1e2e81d07161d612e44f5347b939e02814e7cec1188a7828650d3ffdc9e3",
  "ea2616b63df907752f5b80327029aa1aed9ad346c8c113f2e82f834177ad879b",
  "eaa4051904acefdd5fc24ea45e6d8c503bdfed37309818ae6062dda707d5f232",
  "ec04bf1760978a3b80afddda823417564a2dc7f52be031a1ac7bda279d9a337a",
  "f7bdeca12df4f25565cf15da2983fc42c458bc6a2e62c760fed60549ce137b5d",
  "ff3effd56c01fc74bf6e5ac4bf059e415b5130f31ff1c8e5c7eeadd12c729185"];

export async function handleDataRequest(vendor: string | string[], country: any, page=0, limit=200, req: NextApiRequest, res: NextApiResponse<any>) {
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
        const what = tryParse(req.query.aggregate, null);
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
    const enriched = req.body.payload.data.map(validateAndDenormalise(req.body.payload.location));
    //Add each item from the list
    const namesFound = {};
    const imagesFound = {};
    for (const item of enriched) {
      const img = item.img;
      if(img) {
        delete item.img;
        const imgHash = sha256(img);
        item.imgHash = imgHash;
        const imageMetadata = {imgHash, vendor, name: item.name};
        const image = await db.collection('_images').findOne(imageMetadata);

        // check if in ignoreHashes
        if(_.includes(ignoreHashes, imgHash)) {
          // do not upload ignored
          continue;
        }


        if(!image && !imagesFound[imgHash]) {
          const options = {
            public_id: imgHash,
            unique_filename: false,
            overwrite: false,
          };

          imagesFound[imgHash] = true;

          try {
            // @ts-ignore
            cloudinary.uploader.upload(img, options).then(()=> {
              db.collection('_images').insertOne(imageMetadata);
              console.log('uploaded image', imgHash);
            });
          }
          catch (e) {
            console.error('Failed to upload image file for ', item.name, e, img?.length);
          }
        } else {
            console.log('Image already exists');
        }
      }

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

      indexProvidedProduct(item, vendor, country);
    }

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

    const categorised = await getCategoriesFromModel(namesNotCategorised, language);
    const confidenceThreshold = (parseFloat(process.env.CATEGORISATOION_CONFIDENCE_TRESHOLD as string)) || 0.8;

    let itemCategoriesUpdated = 0;
    await Promise.all(Object.keys(categorised).map(async (key)=> {
      const val = categorised[key];

      console.log(key, val, confidenceThreshold);

      if(val?.confidence>confidenceThreshold) {
        const category = val?.prediction;
        if(category) {
          await db.collection('_categories').updateOne(
              {name: key, country: countryFilter},
              {$set: {name: key, category, country, language, vendor}},
              {
                upsert: true
              });
          itemCategoriesUpdated++;
        }

      }

    }));


    console.debug('itemCategoriesUpdated', itemCategoriesUpdated);

    const namesNotExtracted:string[] = [];
    await Promise.all(Object.keys(namesFound).map(async (name)=> {
      const found = await db.collection('_extracted').findOne({name, country: countryFilter, language: languageFilter});
      if(!found) {
        namesNotExtracted.push(name);
      }
    }));


    const extracted = await extractUnitsFromModel(namesNotExtracted, language);
    let itemExtractedUpdated = 0;
    await Promise.all(Object.keys(extracted).map(async (key)=> {
      const val = extracted[key];
      const entities = val?.entities;
      console.log('got result',val);
      if(entities) {

        const metadata = {name: key, country, language, vendor};
        entities.forEach((e)=> {
          metadata[e.label] = e.text;
        });

        await db.collection('_extracted').updateOne(
            {name: key, country: countryFilter?.toLowerCase()},
            {$set: metadata},
            {
              upsert: true
            });
        itemExtractedUpdated++;
      }
    }));

    console.debug('itemExtractedUpdated', itemExtractedUpdated);


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
  const { vendor, country, page, limit } = req.query;
  return await handleDataRequest(vendor as string, country,  (page as string | undefined) as (number | undefined), parseInt(limit as string), req, res);
}