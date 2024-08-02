// implementing muter using middleware so jb jb save kro ya jane se file files upload puuch lena

import multer from "multer";

const storage = multer.diskStorage({
    destination : function (req , file , cb){
        cb(null,"./public/temp")
    },
    //now filename can be uloaded with some uniqueness too
    filename: function (req, file , cb){
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage ,
})