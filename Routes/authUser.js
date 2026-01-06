const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const express = require('express')
const router = express.Router();
const User = require('../Schemas/User')
const crypto = require('crypto');

router.post('/register', async (req, res) => {
    try {
        const { username, password, email, role } = req.body

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 'message': 'Invalid Email format' })
        }

        const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
        const emailDomain = email.toLowerCase().split('@')[1]
        if (!allowedDomains.includes(emailDomain)) {
            return res.status(400).json({ 'message': 'Please use gmail, yahoo, outlook or hotmail email' })
        }

        const dupli = await User.findOne({ username });
        if (dupli) {
            return res.status(403).json({ 'message': 'User already exists' })
        }

        const dupliEmail = await User.findOne({ email });
        if (dupliEmail) {
            return res.status(403).json({ 'message': 'Email already in use' })
        }

        const hashedpwd = await bcrypt.hash(password, 10)

        const newUser = new User({
            username,
            password: hashedpwd,
            email,
            role: role || 'Employee'
        })
        await newUser.save()
        return res.status(201).json({ 'message': `User ${username} registered successfully` })
    }
    catch (err) {
        console.error("Registration Error: ", err)
        res.status(500).json({ error: err.message })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body

        const user = await User.findOne({ username })
        if (!user) {
            return res.status(404).json({ 'message': `User ${username} not found` })
        }

        const pswrd = await bcrypt.compare(password, user.password)
        if (!pswrd) {
            return res.status(403).json({ 'message': 'Incorrect Password' })
        }

        const AccessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.ACCESS_TOKEN,
            { expiresIn: '30d' }
        )

        const RefreshToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.REFRESH_TOKEN,
            { expiresIn: '30d' }
        )

        user.refreshToken = RefreshToken
        await user.save()

        return res.status(201).json({ 
            'message': `User ${username} logged in successfully`,
            token: AccessToken,
            refreshToken: RefreshToken,
            user: {
                role: user.role,
                _id: user._id,
                Username: user.username,
            } 
        })
    }
    catch (err) {
        console.error(err)
    }
})

module.exports = router;