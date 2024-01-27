import mongoose from "mongoose";
import validator from "validator";

interface IUser extends Document{
    _id:string,
    name:string,
    photo:string,
    email:string,
    role:"admin"|"user"
    gender:"male"|"female"
    dob:Date,
    createdAt:Date,
    updatedAt:Date,
    // virtual
    age:number
}

const schema =new mongoose.Schema(
    {
        _id:{
            type:String,
            required:[true,"please enter id"],
        },
        name:{
            type:String,
            required:[true,"please enter name"],
        },
        email:{
            type:String,
            unique:[true,"email already exists"],
            required:[true,"please enter email"],
            validate:validator.default.isEmail
        },
        gender:{
            type:String,
            enum:["male","female"],
            required:[true,"please enter gender"],
        },
        photo:{
            type:String,
            required:[true,"please add photo"],
        },
        role:{
            type:String,
            enum:["admin","user"],
            default:"user",
        },
        dob:{
            type:Date,
            required:[true,"please enter date of birth"],
        }
    },
    {
        timestamps:true,
    }
);

schema.virtual("age").get(function(){
    const today:Date=new Date();
    const dob:Date=this.dob;
    let age:number=today.getFullYear()-dob.getFullYear();
    if(today.getMonth()<dob.getMonth()||(today.getMonth()===dob.getMonth()&&today.getDate()<dob.getDate())){
        age--;
    }
    return age;
});

export const User=mongoose.model<IUser>("User",schema);