// & separately routing we r doing here as extension of app routing
import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";  //import in that way only when export not done in default manner
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

//Route for register in user with storage middleware
router.route("/register").post(
    //now going to use multer as a middleware & uploading files on local Server Path
       upload.fields([  
          {
              name:"avatar",
              maxCount:1
          },
          {
              name:"coverImage",
              maxCount:1
          }
       ]),
    registerUser
) 

// Route for login user 
router.route("/login").post(loginUser)

//secured routes with auth middleware 
router.route("/logout").post(verifyJWT , logoutUser)


export default router; 