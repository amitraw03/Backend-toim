//promise-resolve reject approach
const asyncHandler = (reqHandler) => {
    (req, res, next) => {
        Promise.resolve(reqHandler(req, res, next)).
            catch((err) => next(err))
    }
}


//Higher Order Functions way
//below this is try and catch approach
// const asyncHandler = (fn) => async(req,res,next) =>{
//      try{
//           await fn(req ,res ,next)
//      }
//      catch(err){
//             res.status(err.code || 500).json({
//                 success:false,
//                 message: err.message
//             })
//      }
// }

export default asyncHandler;