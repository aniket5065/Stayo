require('dotenv').config();
const mongoose = require('mongoose');
const initData = require("./data.js");
const Listing = require("../models/listing.js");


const MONGO_URL = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/Wanderlust";

main().then(() =>{
    console.log("connected to db");
}).catch(err =>{
    console.log("Error connecting to database:", err.message);
})


async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () =>{
    await Listing.deleteMany({});
   initData.data = initData.data.map((obj)=>({...obj, owner: "689c56a94f61e47de3785a0b"}))
    await Listing.insertMany(initData.data);
    console.log("data was initalized");


};
 
initDB();