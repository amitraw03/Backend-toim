// basically we r using controllers as a separate extension for routes which makes it industry std
import asyncHandler from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
// import bcrypt from "bcrypt"  

const generateAccessAndRefreshTokens = async (userId) => {  //no asyncHanlder becoz no handling web requests insetad local function
   try {
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      //we need to save refresh Token in D.B to prevent from continuous login info  demand
      user.refreshToken = refreshToken
      await user.save({ validateBeforeSave: false })

      return { accessToken, refreshToken }

   }
   catch (err) {
      throw new ApiError(500, "Something went wrong while generating access and refresh token")
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

   // const hashPassword = await bcrypt.hash(password,10) 
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
      throw new ApiError(500, " Something went wrong while registering the user")
   }

   //(9) return res
   return res.status(201).json(
      new ApiResponse(200, createdUser, "User Registered Successfully!!")
   )

})

const loginUser = asyncHandler(async (req, res) => {
   //(1) take data <- req body
   const { username, email, password } = req.body

   //(2) checking existence on basis of username or email
   if (!username && !email) {
      throw new ApiError(400, "Username or email is required")
   }

   //(3) find the user
   const user = await User.findOne({
      $or: [{ username }, { email }]
   })
   if (!user) {
      throw new ApiError(404, "user doesn't exist!!")
   }

   //(4) checking password
   const isPasswordValid = await user.isPasswordCorrect(password)
   if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials")
   }


   //(5) access and reresh Token generation
   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

   //(5) data we want to send now to loginUser after all above 4 steps 
   const loggedInUser = await User.findById(user._id).select
      ("-password -refreshToken")

   //(6) Send Cookie
   const options = {
      httpOnly: true,
      secure: true
   }

   return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }
            , "User loggedIn successfully!!")
      )

})

const logoutUser = asyncHandler(async (req, res) => {
   //now becoz of auth middleware i have access of user in req
   //why we r collecting it becoz for logOut user (1) we need to delete created user's refresh token
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined
         }
      },
      {
         new: true
      }
   )

   // (2) Clearing Cookies
   const options = {
      httpOnly: true,
      secure: true
   }

   return res.status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User Logged Out"))

})

//Refreshing Your Access Token using session storage(refresh token  stored in d.b too)
const refreshAccessToken = asyncHandler(async (req, res) => {
   //collect refreshToken of user to hold the instance
   const incomingRefreshToken = req.cookies.refreshToken || req.header.refreshToken
   if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized Request")
   }

   try {
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

      const user = await User.findById(decodedToken?._id)
      if (!user) {
         throw new ApiError(401, "Invalid Refresh Token")
      }

      //checking token expired or not
      if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh Token is expired or used")
      }

      //   Now lets generate new token 
      const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(usre._id)

      const options = {
         httpOnly: true,
         secure: true
      }

      res.status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access Token Refreshed"))

   } catch (err) {
      throw new ApiError(401, "Invalid Refresh Token")
   }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
   const { oldPassword, newPassword } = req.body
   //for changing paassword that means userloggedIn & from there we can extract user obj
   const user = await User.findById(req.user?._id)

   const isPasswordMatch = user.isPasswordCorrect(oldPassword)
   if (!isPasswordMatch) {
      throw new ApiError(400, " Invalid Old password")
   }

   // here only that mean oldpass matched
   user.password = newPassword
   await user.save({ validateBeforeSave: false })

   return res.status(200)
      .json(new ApiResponse(200, {}, " Password changed Successfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
   //easily getif userLoggedIN
   return res.status(200)
      .json(200, req.user, "Current User fetched Successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
   const { fullName, email } = req.body       //to access data sent in the request body, typically from POST or PUT requests

   if (!fullName || !email) {
      throw new ApiError(400, "All fields are required")
   }

   //coz for this, user should be loggedIn
   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            fullName: fullName,
            email: email
         }
      },
      { new: true } // this will return the updated data response

   ).select("-password")

   return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"))

})

//updating except text conent too
const updateUserAvatar = asyncHandler(async (req, res) => {
   const avatarLocalPath = req.file?.path     //  req.file is used to handle file uploads & Purpose: To access the file that has been uploaded in a request

   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing")
   }

   //TODO: delete old image - assignment
   const newAvatar = await uploadOnCloudinary(avatarLocalPath)  //new avatar uploading on cloduinary

   if (!newAvatar.url) {
      throw new ApiError(400, "Error while uploading on avatar")

   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            avatar: newAvatar.url   //that uploaded new avatar will replace
         }
      },
      { new: true }
   ).select("-password")

   return res
      .status(200)
      .json(
         new ApiResponse(200, user, "Avatar image updated successfully")
      )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
   const coverImageLocalPath = req.file?.path

   if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover image file is missing")
   }

   const newCoverImage = await uploadOnCloudinary(coverImageLocalPath)

   if (!newCoverImage.url) {
      throw new ApiError(400, "Error while uploading on coverImage")

   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            coverImage: newCoverImage.url
         }
      },
      { new: true }
   ).select("-password")

   return res
      .status(200)
      .json(
         new ApiResponse(200, user, "Cover image updated successfully")
      )
})

//Aggregation Pipelines we will use
const getUserChannelProfile = asyncHandler(async (req, res) => {
   const { username } = req.params  // to extract dynamic segments from the URL path

   if (!username?.trim()) {
      throw new ApiError(400, "Username is Missing")
   }

   const channel = await User.aggregate([
      {
         $match: {
            username: username?.toLowerCase()
         }
      },
      {
         $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",  //it behaves as the count {docs where this Ffield present}
            as: "subscribers"
         }
      },
      {
         $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
         }
      },
      {
         $addFields: {
            subscribersCount: {
               $size: "$subscribers"
            },
            channelsSubscribedToCount: {
               $size: "$subscribedTo"
            },
            isSubscribed: {
               $condn: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false
               }
            }
         }
      },
      {
         $project: {
            fullName: 1,
            username: 1,
            avatar: 1,
            coverImage: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1
         }
      }
   ])

   if (!channel?.length) {
      throw new ApiError(404, "Channel doesn't exist")
   }

   return res.status(200)
      .json(new ApiResponse(200, channel[0], "User channel fetched Successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
   const user = await User.aggregate([
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [{
               $lookup: {
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "owner",
                  pipeline: [
                     {
                        $project: {
                           fullName: 1,
                           username: 1,
                           avatar: 1
                        }
                     }
                  ]
               }
            }
            ]
         }
      }
   ])
   
   return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )

})

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory

}