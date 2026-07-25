import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import swaggerUI from "swagger-ui-express";
import { swaggerSpec } from "./src/config/swagger.js";
import cors from "cors";

// routes import
import { partRoutes } from './src/routes/inventory/part.routes.js';
import { jobcardRoutes } from './src/routes/app/jobcard.routes.js';
import { receiptRoute } from './src/routes/inventory/receipt.routes.js';
import { userRoutes } from './src/routes/app/user.routes.js';
import { billingRoutes } from './src/routes/app/billing.routes.js';
import { menuRoutes } from './src/routes/app/menu.routes.js';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 6969;

// cors
const corsOptions = {
    origin: 'http://localhost:5173',       // exact frontend origin
    credentials: true,                     // allow cookies/credentials
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With', 'x-auth-token'],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Ensure OPTIONS preflight is handled
app.options(/.*/, cors(corsOptions));

// Body parser middleware
app.use(express.json());

// swagger middleware
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec, {
        swaggerOptions: {
            tagsSorter: "alpha",
            operationsSorter: "alpha"
        }
    })
);

// API Routes
app.use('/api/part', partRoutes);
app.use("/api/jobcard", jobcardRoutes);
app.use("/api/receipt", receiptRoute);
app.use("/api/user", userRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/menu", menuRoutes);

// Base health check route
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'API is running smoothly' });
});

app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
});