import { User } from "../models/user.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.js";

export const adminOnly=TryCatch(async(req,res,next)=>{
    const {id}=req.query
    if(!id)return next(new ErrorHandler("please provide id",401))
    const user=await User.findById(id);
    if(!user)return next(new ErrorHandler("invalid id",401))
    if(user.role!=="admin")return next(new ErrorHandler("you are not authorized to access this route",401))
    next()
})