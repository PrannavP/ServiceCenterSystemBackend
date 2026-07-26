import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import swaggerUI from "swagger-ui-express";
import { swaggerSpec } from "./src/config/swagger.js";
import cors from "cors";

import { partRoutes } from './src/routes/inventory/part.routes.js';
import { jobcardRoutes } from './src/routes/app/jobcard.routes.js';
import { receiptRoute } from './src/routes/inventory/receipt.routes.js';
import { userRoutes } from './src/routes/app/user.routes.js';
import { billingRoutes } from './src/routes/app/billing.routes.js';
import { menuRoutes } from './src/routes/app/menu.routes.js';
import { chatbotRoutes } from './src/routes/app/chatbot.routes.js';
import { staticRoutes } from './src/routes/app/static.routes.js';
import { dashboardRoutes } from './src/routes/app/dashboard.routes.js';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 6969;

const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        const allowedOrigins = ['http://localhost:5173', 'http://10.10.1.135:5173'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all origins for now (mobile app support)
        }
    },
    credentials: true,                     // allow cookies/credentials
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With', 'x-auth-token'],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

app.use('/uploads', express.static('uploads'));

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec, {
        swaggerOptions: {
            tagsSorter: "alpha",
            operationsSorter: "alpha"
        }
    })
);

app.use('/api/part', partRoutes);
app.use("/api/jobcard", jobcardRoutes);
app.use("/api/receipt", receiptRoute);
app.use("/api/user", userRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/static", staticRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'API is running smoothly' });
});

app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
});