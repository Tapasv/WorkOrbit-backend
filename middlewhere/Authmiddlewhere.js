const jwt = require('jsonwebtoken')
const User = require('../Schemas/User')

const Authmiddlwhere = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(404).json({ 'message': 'token not found' })
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN)
        const user = await User.findById(decoded.userId).select("_id username role")

        if (!user) {
            return res.status(404).json({ 'message': `User not found` })
        }

        req.user = {
            id: user._id.toString(),
            role: user.role,
            username: user.username
        };
        next()
    }
    catch (err) {
        console.error("Auth error:", err.message)
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}

const AdminOnly = async (req, res, next) => {
    if (req.user.role !== "Admin") {
        return res.status(403).json({ 'message': 'Admin role requires!!' })
    }
    next();
}

module.exports = { Authmiddlwhere, AdminOnly }