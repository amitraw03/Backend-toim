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



export default app;