import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.js";
import { NewUserRequestBody } from "../types/types.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";

export const newUser=TryCatch(async(req:Request<{},{},NewUserRequestBody>,res:Response,next:NextFunction)=>{
    const {name,email,photo,gender,_id,dob}=req.body;
    if(!name||!email||!photo||!gender||!_id||!dob){
        return next(new ErrorHandler("please provide all the required fields",400))
    }
    let user=await User.findById(_id);
    if(user){
        return res.status(200).json({
            success:true,
            message:`welcome back ${user.name}`,
        })
    }
    user=await User.create({name,email,photo,gender,_id,dob:new Date(dob)})
    return res.status(201).json({
        success:true,
        message:`welcome ${user.name}`,
    })
})

export const getAllUsers=TryCatch(async(req,res,next)=>{
    const users=await User.find({});
    return res.status(200).json({
        success:true,
        users,
    })
})

export const getUserById=TryCatch(async(req,res,next)=>{
    const user=await User.findById(req.params.id);
    if(!user){
        return next(new ErrorHandler("invalid id",400))
    }
    return res.status(200).json({
        success:true,
        user,
    })
})

export const deleteUserById=TryCatch(async(req,res,next)=>{
    const user=await User.findById(req.params.id);
    if(!user){
        return next(new ErrorHandler("invalid id",400))
    }
    await user.deleteOne();
    return res.status(200).json({
        success:true,
        message:"user deleted successfully",
    })
})