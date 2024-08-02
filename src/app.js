import express from 'express'
import cors from "cors"
import cookieParser from 'cookie-parser';

const app= express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    Credentials:true
}))

//configurations--
app.use(express.json({limit :"15kb"})) //data coming in backend as json
app.use(express.urlencoded())
app.use(express.static("public"))  //data coming in img,vid etc
app.use(cookieParser())


//routes import 
import userRouter from './routes/user.routes.js';  //can override names only if export done in default manner

//routes declration -- 

// std practice-- defining as general Apis
app.use('/api/v1/users', userRouter)   // https://localhost:8000/api/v1/users/register


export default app;