// & separately routing we r doing here as extension of app routing
import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";  //import in that way only when export not done in default manner
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

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


export default router; 