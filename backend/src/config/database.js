// import mongoose from 'mongoose'

// // const connectDB = async () => {
// //   try {
// //     await mongoose.connect(process.env.MONGODB_URI);
// //     console.log("MongoDB connected");
// //   } catch (error) {
// //     console.error("MongoDB connection error:", error);
// //     process.exit(1);
// //   }
// // };

// // export default connectDB;

import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const connectioInstance = await mongoose.connect(`${process.env.MONGODB_URI}`)
    console.log(`\n MongoDB conneted !!! ${connectioInstance.connection.host} `)
  } catch (error) {
    console.log('MongoDB connection failed', error)
    process.exit(1)
  }
}
export default connectDB
