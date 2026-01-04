const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true},
    password: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    role: {type: String, enum: ["Admin", "Manager", "Employee"], default: "Employee"},
    refreshToken: {type: String}
})

module.exports = mongoose.model("User", UserSchema)