const swaggerUI = require("swagger-ui-express")
const swaggerJsDoc = require("swagger-jsdoc")
const express = require("express");
const app = express();


const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Brain Data API",
            version: "1.0.0",
            description: "",
        },
        servers: [
            {
                url: "http://localhost:3000",
            },
        ],
    },
    apis: ["routers/*.js"],
};

const swagger = swaggerJsDoc(options);


app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swagger));


module.exports = swagger;