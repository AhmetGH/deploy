const idDecoder = (codedId) => {
  const decodeId = atob(codedId, "base64").toString("utf-8");
  const decodedId = decodeId.replace(/^"(.*)"$/, "$1");
  console.log(decodedId);
  return decodedId;
};

module.exports = idDecoder;



