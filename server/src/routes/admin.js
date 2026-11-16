import { Router } from 'express';
import User from '../models/User.js'; import Car from '../models/Car.js'; import Booking from '../models/Booking.js';
import { protect, allow } from '../middleware/auth.js';
const router = Router(); router.use(protect, allow('admin'));
router.get('/overview', async (_req,res,next)=>{ try { const [users,cars,pendingCars,bookings,revenue] = await Promise.all([User.countDocuments(),Car.countDocuments(),Car.countDocuments({status:'PENDING'}),Booking.countDocuments(),Booking.aggregate([{ $match:{status:'COMPLETED'}},{ $group:{_id:null,total:{ $sum:'$rentalTotal'}}}])]); res.json({users,cars,pendingCars,bookings,grossRentalRevenue:revenue[0]?.total||0}); } catch(e){next(e);} });
router.get('/cars/pending', async (_req,res,next)=>{try{res.json({cars:await Car.find({status:'PENDING'}).populate('host','name email')});}catch(e){next(e);}});
router.patch('/cars/:id', async (req,res,next)=>{try{const status=req.body.status;if(!['APPROVED','REJECTED','INACTIVE'].includes(status))return res.status(400).json({message:'Invalid status'});const car=await Car.findByIdAndUpdate(req.params.id,{status},{new:true});if(!car)return res.status(404).json({message:'Vehicle not found'});res.json({car});}catch(e){next(e);}});
router.get('/users',async(_req,res,next)=>{try{res.json({users:await User.find().select('-password').sort({createdAt:-1}).limit(250)});}catch(e){next(e);}});
export default router;
