import express  from "express";
import { deleteUserById, getAllUsers, getUserById, newUser } from "../controllers/user.js";
import { adminOnly } from "../middlewares/auth.js";

const app=express.Router();

app.post('/new',newUser)
app.get("/all",adminOnly,getAllUsers)
app.route("/:id").get(getUserById).delete(adminOnly,deleteUserById)

export default app;
