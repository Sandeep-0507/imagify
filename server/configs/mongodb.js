import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on('connected', () => {
        console.log("Database Connected");
    });

    await mongoose.connect(process.env.MONGODB_URI, {
        // Set proper write concern
        w: "majority",   
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
};

export default connectDB;
