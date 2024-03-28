const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  swaggerDefinition: {
    info: {
      title: 'Knowladge Base App',
      version: '1.0.0',
      description: 'API for Knowladge Base',
    },
  },
  apis: ['./routers/*.js'], // Rotaların bulunduğu dosyaların yollarını buraya ekleyin
};


const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;

