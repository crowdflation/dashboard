import _ from "lodash";

export function cleanupPriceName(name) {
    name = _.replace(name, /\n/g, ' ');
    name = _.replace(name, /\s\s+/g, ' ');
    name = _.replace(name, /about+/g, '');
    name = _.replace(name, /each+/g, '');
    name = _.replace(name, /Now+/g, '');
    name = _.replace(name, /\. /g, '.');
    if(_.includes(name, 'discounted')) {
        name = name.split('discounted');
        name = name[0];
    }
    return _.trim(name,'\n \t\r');
}

const regex = /[+-]?\d+(\.\d+)?/g;

export function getPriceValue(name) {
    const cleanedUp= cleanupPriceName(name);
    const parsed = cleanedUp?.match(regex);
    if(!parsed || !parsed[0]) {
        return null;
    }
    return parseFloat(parsed[0]);
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