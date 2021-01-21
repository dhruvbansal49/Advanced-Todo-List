const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passlocmon = require('passport-local-mongoose');

const employeeSchema = new Schema({
    name:{
        type:String,
        // required:true,
    },
    username:{
        type:String,
        // required:true,
    },
    password:{
        type:String,
        // required:true
    },
    projects:[{
        title:{
            type:String
        },
        tasks:[
            {
            name:{
                type:String
            },
            iteration:{
                type:Number
            },
            chk:{
                type:Number,
                enum:[0,1]
            }
        }
    ]
}]
})
employeeSchema.plugin(passlocmon);
module.exports = new mongoose.model('Employee',employeeSchema)