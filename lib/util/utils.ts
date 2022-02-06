import _ from "lodash";

export function cleanupPriceName(name) {
    name = _.replace(name, /\n/g, ' ');
    name = _.replace(name, /\s\s+/g, ' ');
    return _.trim(name,'\n \t\r');
}