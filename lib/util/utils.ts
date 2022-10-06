import _ from "lodash";

export function cleanupPriceName(name) {
    name = _.replace(name, /\n/g, ' ');
    name = _.replace(name, /\s\s+/g, ' ');
    name = _.replace(name, /about+/g, '');
    name = _.replace(name, /each+/g, '');
    name = _.replace(name, /Now+/g, '');
    name = _.replace(name, /now+/g, '');
    name = _.replace(name, /\. /g, '.');
    if(_.includes(name, 'discounted')) {
        name = name.split('discounted');
        name = name[0];
    }

    name = _.trim(name,'\n \t\r\.');


    const moreThanOne = name?.split('£')
    if(moreThanOne?.length>=3) {
        return '£' + (moreThanOne[0]?moreThanOne[0]:moreThanOne[1]);
    }

    const rez = name?.match(/[0-9][0-9]?p/);
    if(rez && rez[0]) {
        console.log('trying to remove p', name, rez, rez[0]);
        return '£0.' + _.trim(rez[0], 'p');
    }

    return name;
}

const regex = /[+-]?\d+(\.\d+)?/g;

export function getPriceValue(name) {
    const cleanedUp= cleanupPriceName(name);
    const parsed = cleanedUp?.match(regex);
    if(!parsed || !parsed[0]) {
        console.log('failed parsing', name, cleanedUp, parsed);
        return null;
    }
    const rez= parseFloat(parsed[0]);
    if(rez===0) {
        console.log('Failed parsing 2', name, cleanedUp, parsed);
        return parseFloat(parsed[1]);
    }
    return rez;
}

export function isValidPrice(name) {

    if(_.includes(name, '¢/')) {
        return false;
    }


    const value = getPriceValue(name);
    if(!value) {
        return false;
    }

    return true;
}