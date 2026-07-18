import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Service Center Backend ",
            version: "1.0.0",
            description: "API documentation for Node.js TypeScript application"
        },
        servers: [
            {
                url: "http://localhost:6969",
                description: "Development Server"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },
    apis: [
        "./src/routes/**/*.ts",
        "./src/controllers/**/*.ts"
    ]
};


export const swaggerSpec = swaggerJsdoc(options);