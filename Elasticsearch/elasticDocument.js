const esClient = require('./elasticClient');
const insertDoc = async function (indexName, _id, mappingType, data) {
    return await esClient.index({
        index: indexName,
        type: mappingType,
        id: _id,
        body: data
    });
}
 
module.exports = insertDoc;