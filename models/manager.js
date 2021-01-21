const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passlocmon = require('passport-local-mongoose');
const managerSchema = new Schema({
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
    projects:[
        {
            type: Schema.Types.ObjectId,
            ref: 'Project'
        }
    ]
})
managerSchema.plugin(passlocmon);
module.exports = mongoose.model('Manager',managerSchema);