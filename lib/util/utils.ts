import _ from "lodash";

export function cleanupPriceName(name) {
    name = _.replace(name, /\n/g, ' ');
    name = _.replace(name, /\s\s+/g, ' ');
    if(_.includes(name, 'discounted')) {
        name = name.split('discounted');
        name = name[0];
    }
    return _.trim(name,'\n \t\r');
}