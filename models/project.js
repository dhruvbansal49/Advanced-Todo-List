const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const projectSchema = new Schema({
    title:{
        type:String         
    },
    employees:[
        {
            type: Schema.Types.ObjectId,
            ref: 'Employee'
        }
    ]
})
module.exports = new mongoose.model('Project',projectSchema);