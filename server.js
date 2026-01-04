require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { DBconnect } = require('./DBconnect')

const authUser = require('./Routes/authUser')
const authRequest = require('./Routes/authRequest')
const authAttendance = require('./Routes/authAttendance')
const authTeams = require("./Routes/authTeams");

const port = process.env.PORT || 5000;
const server = http.createServer(app);

const corsOptions = {
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'https://workorbit-backend-27l6.onrender.com', 'https://work-orbit-frontend.vercel.app/'],
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};


app.use(cors(corsOptions));

app.use(express.json())

DBconnect()

app.use('/api/auth', authUser)
app.use('/api/request', authRequest)
app.use('/api/attendance', authAttendance)
app.use("/api/team", authTeams);

mongoose.connection.once('open', () => {
    console.log("✅ Connected to Database!");
    server.listen(port, '0.0.0.0', () => console.log(`🚀 Server running on port ${port}`));
});