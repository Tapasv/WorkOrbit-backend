const mongoose = require('mongoose')

const RequestSchema = new mongoose.Schema({
    title: { type: String, required: true,},
    description: {type: String, required: true},
    status: {type: String, enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CLOSED", "REOPENED", "WITHDRAWN"], default: "DRAFT"},
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "User"}
}, {timestamps: true})

module.exports = mongoose.model("Request", RequestSchema)