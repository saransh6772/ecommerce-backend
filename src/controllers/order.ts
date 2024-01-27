import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { NewOrderRequestBody } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import { myCache } from "../app.js";

export const newOrder = TryCatch(async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const { shippingInfo, orderItems, user, subtotal, tax, shippingCharges, discount, total, } = req.body;
    if (!shippingInfo || !orderItems || !user || !subtotal || !tax || !total){
        return next(new ErrorHandler("Please Enter All Fields", 400));
    }
    const order = await Order.create({shippingInfo,orderItems,user,subtotal,tax,shippingCharges,discount,total,});
    await reduceStock(orderItems);
    invalidateCache({product:true, order: true ,admin: true,userId:user,productId:order.orderItems.map(i=>String(i.productId))});
    res.status(201).json({
        success: true,
        message: "Order Placed Successfully",
    })
})

export const myOrders = TryCatch(async (req, res, next) => {
    const {id:user}=req.query;
    let orders;
    if(myCache.has(`my-orders-${user}`))orders=JSON.parse(myCache.get(`my-orders-${user}`) as string);
    else{
        orders = await Order.find({user});
        myCache.set(`my-orders-${user}`,JSON.stringify(orders));
    }
    res.status(200).json({
        success: true,
        orders,
    })
})

export const allOrders = TryCatch(async (req, res, next) => {
    let orders;
    if(myCache.has("all-orders"))orders=JSON.parse(myCache.get("all-orders") as string);
    else{
        orders = await Order.find().populate("user","name");
        myCache.set("all-orders",JSON.stringify(orders));
    }
    res.status(200).json({
        success: true,
        orders,
    })
})

export const getSingleOrder = TryCatch(async (req, res, next) => {
    const {id}=req.params;
    let order;
    if(myCache.has(`order-${id}`))order=JSON.parse(myCache.get(`order-${id}`) as string);
    else{
        order = await Order.findById(id).populate("user","name");
        if(!order)return next(new ErrorHandler("Order Not Found", 404));
        myCache.set(`order-${id}`,JSON.stringify(order));
    }
    res.status(200).json({
        success: true,
        order,
    })
})

export const processOrder = TryCatch(async (req, res, next) => {
    const {id}=req.params;
    const order=await Order.findById(id);
    if(!order)return next(new ErrorHandler("Order Not Found", 404));
    switch(order.status){
        case "Processing":
            order.status="Shipped";
            break;
        case "Shipped":
            order.status="Delivered";
            break;
        default:
            order.status="Delivered";
            break;
    }
    await order.save();
    invalidateCache({product:false, order: true ,admin: true,userId:order.user,orderId:String(order._id)});
    res.status(200).json({
        success: true,
        message: "Order Processed Successfully",
    })
})

export const deleteOrder = TryCatch(async (req, res, next) => {
    const {id}=req.params;
    const order=await Order.findById(id);
    if(!order)return next(new ErrorHandler("Order Not Found", 404));
    await order.deleteOne();
    invalidateCache({product:false, order: true ,admin: true,userId:order.user,orderId:String(order._id)});
    res.status(200).json({
        success: true,
        message: "Order Deleted Successfully",
    })
})