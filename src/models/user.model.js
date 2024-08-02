import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt, { hash } from "bcrypt"

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true  //this makes the searching on that field a lot easier
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,  //cloudnary URL
        required: true,
    },
    coverImage: {
        type: String,  //cloudnary URL
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String
    }
}, { timestamps: true })

//hash password just before save in D.B using pre middleware hook
userSchema.pre('save', async function (next) {
    if (!this.isModified(this.password)) return next();

    this.password = await bcrypt.hash("password", 10)
    next()
})

//checking password property we created
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

//generating tokens --
userSchema.methods.generateAccessToken = function () {
    jwt.sign({   //takes 3 params
        _id: this._id,
        username: this.username,

    }, process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    jwt.sign({   //takes 3 params
        _id: this._id,

    }, process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )

}


export const User = mongoose.model("User", userSchema)  //this User model can make direct contact with D.B