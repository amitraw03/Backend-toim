import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";  //import in that way only when export not done in default manner

const router = Router()

router.route("/register").post(registerUser) 


export default router; 