import express, { NextFunction, Request, Response } from 'express';
import { connectDB } from './utils/features.js';
import { errorMiddleware } from './middlewares/error.js';
import { config } from 'dotenv';
import cors from 'cors';

import userRoute from './routes/user.js';
import productRoute from './routes/product.js';
import orderRoute from './routes/order.js';
import paymentRoute from "./routes/payment.js";
import dashboardRoute from "./routes/stats.js";

import morgan from 'morgan';

import NodeCache from 'node-cache';
import Stripe from 'stripe';

config({
    path:"./.env"
});

const port=process.env.PORT||4000;
const stripeKey=process.env.STRIPE_KEY||"";

const app=express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

connectDB(process.env.MONGO_URI as string);

export const stripe = new Stripe(stripeKey)
export const myCache = new NodeCache();

app.get("/",(req,res)=>{
    res.send("hello world")
})

app.use("/api/v1/user",userRoute);
app.use("/api/v1/product",productRoute);
app.use("/api/v1/order",orderRoute);
app.use("/api/v1/payment",paymentRoute);
app.use("/api/v1/dashboard",dashboardRoute);

app.use("/uploads",express.static("uploads"));


app.use(errorMiddleware);

app.listen(port,()=>{
    console.log(`server is working on http://localhost:${port}`)
})