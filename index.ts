import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import { partRoutes } from './src/routes/inventory/part.routes.js';
import { jobcardRoutes } from './src/routes/app/jobcard.routes.js';
import { receiptRoute } from './src/routes/inventory/receipt.routes.js';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 6969;

// Body parser middleware
app.use(express.json());

// API Routes
app.use('/api/part', partRoutes);
app.use("/api/jobcard", jobcardRoutes);
app.use("/api/receipt", receiptRoute);

// Base health check route
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'API is running smoothly' });
});

app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
});