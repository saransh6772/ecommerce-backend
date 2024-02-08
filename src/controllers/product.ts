import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";

export const newProduct=TryCatch(async(req:Request<{},{},NewProductRequestBody>,res,next)=>{
    const {name,category,price,stock}=req.body;
    const photo=req.file;
    if(!photo){
        return next(new ErrorHandler("Please upload a photo",400))
    }
    if(!name||!category||!price||!stock){
        rm(photo.path,()=>{
            console.log("photo deleted")
        })
        return next(new ErrorHandler("Please provide all the fields",400))
    }
    await Product.create({
        name,
        category:category.toLowerCase(),
        price,
        stock,
        photo:photo?.path
    })
    invalidateCache({product:true,admin:true});
    return res.status(201).json({
        status:"success",
        message:"New product created"
    })
})

export const getLatestProducts=TryCatch(async(req,res,next)=>{
    let products;
    if(myCache.has("latest-product")){
        products=JSON.parse(myCache.get("latest-product") as string)
    }
    else{
        products=await Product.find().sort({createdAt:-1}).limit(4);
        myCache.set("latest-product",JSON.stringify(products))
    }
    return res.status(201).json({
        status:"success",
        products
    })
})

export const getAllCategories=TryCatch(async(req,res,next)=>{
    let categories;
    if(myCache.has("categories")){
        categories=JSON.parse(myCache.get("categories") as string)
    }
    else{
        categories=await Product.find().distinct("category");
        myCache.set("categories",JSON.stringify(categories))
    }
    return res.status(201).json({
        status:"success",
        categories
    })
})

export const getAdminProducts=TryCatch(async(req,res,next)=>{
    let products;
    if(myCache.has("all-products")){
        products=JSON.parse(myCache.get("all-products") as string)
    }
    else{
        products=await Product.find();
        myCache.set("all-products",JSON.stringify(products))
    }
    return res.status(201).json({
        status:"success",
        products
    })
})

export const getProduct=TryCatch(async(req,res,next)=>{
    let product;
    if(myCache.has(`product-${req.params.id}`)){
        product=JSON.parse(myCache.get(`product-${req.params.id}`) as string)
    }
    else{
        product=await Product.findById(req.params.id);
        if(!product){
            return next(new ErrorHandler("Product not found",404))
        }
        myCache.set(`product-${req.params.id}`,JSON.stringify(product))
    }
    return res.status(201).json({
        status:"success",
        product
    })
})

export const updateProduct=TryCatch(async(req,res,next)=>{
    const {name,category,price,stock}=req.body;
    const photo=req.file;
    const product=await Product.findById(req.params.id);
    if(!product){
        return next(new ErrorHandler("Product not found",404))
    }
    if(photo){
        rm(product.photo!,()=>{
            console.log("old photo deleted")
        })
        product.photo=photo.path;
    }
    if(name){product.name=name}
    if(category){product.category=category.toLowerCase()}
    if(price){product.price=price}
    if(stock){product.stock=stock}
    await product.save();
    invalidateCache({product:true,productId:String(product._id),admin:true});
    return res.status(201).json({
        status:"success",
        message:"Product updated"
    })
})

export const deleteProduct=TryCatch(async(req,res,next)=>{
    const product=await Product.findById(req.params.id);
    if(!product){
        return next(new ErrorHandler("invalid product id",400))
    }
    rm(product.photo!,()=>{
        console.log("photo deleted")
    })
    await product.deleteOne();
    invalidateCache({product:true,productId:String(product._id),admin:true});
    return res.status(200).json({
        status:"success",
        message:"Product deleted"
    })
})

export const getAllProducts=TryCatch(async(req:Request<{},{},{},SearchRequestQuery>,res,next)=>{
    const {search,category,price,sort}=req.query;
    const page=Number(req.query.page)||1;
    const limit=Number(process.env.PRODUCT_PER_PAGE)||8;
    const skip=(page-1)*limit;
    const baseQuery:BaseQuery={}
    if(search){
        baseQuery.name={
            $regex:search,
            $options:"i"
        }
    }
    if(price){
        baseQuery.price={
            $lte:Number(price)
        }
    }
    if(category){
        baseQuery.category=category;
    }
    const [products,filteredOnly]=await Promise.all([
        Product.find(baseQuery).sort(sort?{price:sort==="asc"?1:-1}:undefined).limit(limit).skip(skip),
        Product.find(baseQuery)
    ])
    const totalPage=Math.ceil(filteredOnly.length/limit);
    return res.status(201).json({
        status:"success",
        products,
        totalPage
    })
})