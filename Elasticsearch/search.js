const elasticClient = require('./elasticClient');
const search = async function (indexName, mappingType, searchQuery) {
    return await elasticClient.search({
        index: indexName,
        type: mappingType,
        body: searchQuery
    });
}
 
module.exports = search;