// basically we r using controllers as a separate extension for routes which makes it industry std
import asyncHandler from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser = asyncHandler(async (req, res) => {
   //(1) get user details from frontend i.e user model
   const { fullName, email, username, password } = req.body

   //(2) Validation --ADV WAY**
   if (
      [fullName, email, username, password].some(
         (field) => field?.trim() === "")
   ) {
      throw new ApiError(400, "All fields are required")
   }

   //(3) check if user already exists : username etc --ADV WAY***
   const existedUser = await User.findOne({
      $or: [{ username }, { email }]
   })
   if (existedUser) throw new ApiError(409, " data with this username or email is already existed")

   //(4) check for images , check for avatar
   const avatarLocalPath = req.files?.avatar[0]?.path;   //req.files is a multer property (just like req.body is of express) & now checking before sending to cloudinary
   const coverImageLocalPath = req.files?.coverImage[0]?.path;
   if (!avatarLocalPath) {
      throw new ApiError(400, "avatar file is required")
   }

   //(5) upload them to cloudinry & avatar checking 
   // console.log(avatarLocalPath) 
   const avatar = await uploadOnCloudinary(avatarLocalPath)
   // console.log(avatar)  
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)
   if (!avatar) {
      throw new ApiError(400, "avatar file is required")
   }

   //(6) create user obj- create entry in DB
   const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",  //becoz didn't cheeck coverImage existence before
      email,
      password,
      username: username.toLowerCase()
   })

   //(7) remove password & refresh token field from response
   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

   //(8) check for user creation
   if (!createdUser) {
      throw new ApiError(500 , " Something went wrong while registering the user")
   }

   //(9) return res
   return res.status(201).json(
       new ApiResponse(200 , createdUser , "User Registered Successfully!!")
   )

}) 

export { registerUser }