// basically we r using controllers as a separate extension for routes which makes it industry std
import asyncHandler from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async (userId) =>{  //no asyncHanlder becoz no handling web requests insetad local function
     try{
        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        //we need to save refresh Token in D.B to prevent from continuous login info  demand
        user.refreshToken = refreshToken 
        await user.save({validateBeforeSave : false})

        return{accessToken ,refreshToken}

     }
     catch(err){
      throw new ApiError(500 ,"Something went wrong while generating access and refresh token")
     }
}

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

const loginUser = asyncHandler ( async (req,res )=>{
     //(1) take data <- req body
        const {username , email ,password} =req.body

     //(2) checking existence on basis of username or email
      if(!username || !email){
         throw new ApiError(400 ,"Username or email is required")
      }

     //(3) find the user
       const user= User.findOne({
         $or: [{username},{email}]
        })
        if(!user){
         throw new ApiError(404 ,"user doesn't exist!!")
        }

     //(4) checking password
        const passwordValidation =  await user.isPasswordCorrect(password)
        if(!passwordValidation){
         throw new ApiError(401 ,"Invalid User credential")
        }

     //(5) access and refresh Token generation
    const {accessToken , refreshToken} =  await generateAccessAndRefreshTokens(user._id)

     //(5) data we want to send now to loginUser after all above 4 steps 
         const loggedInUser = await User.findById(user._id).select
         ("-password -refreshToken")
     
     //(6) Send Cookie
      const options ={
         httpOnly:true,
         secure:true
      }

      return res.status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
         new ApiResponse(200 , { user :loggedInUser , accessToken , refreshToken}
                                ,"User loggedIn successfully!!")
      )

})

const logoutUser = asyncHandler (async (req,res) =>{
     //now becoz of that middleware i have access of user in req
     //why we r collecting it becoz for logOut user (1) we need to delete created user's refresh token
      await User.findByIdAndUpdate(
          req.user._id,
          {
              $set :{
                refreshToken: undefined
              }
          },
          {
            new: true
          }
      )
    
      // (2) Clearing Cookies
      const options ={
         httpOnly:true,
         secure:true
      }

      return res.status(200)
      .clearCookie("accessToken",options)
      .clearCookie("refreshToken",options)
      .json( new ApiResponse( 200 ,{} ,"User Logged Out"))
     
})

export { registerUser , loginUser , logoutUser}