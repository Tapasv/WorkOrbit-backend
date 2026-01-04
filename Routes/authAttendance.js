const express = require('express');
const router = express.Router();
const { Authmiddlwhere, AdminOnly } = require('../middlewhere/Authmiddlewhere');
const Attendance = require('../Schemas/Attendance');
const User = require('../Schemas/User');
const MIN_WORK_HOURS = 4;
const MIN_WORK_MS = MIN_WORK_HOURS * 60 * 60 * 1000;


// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// Helper function to calculate work hours
const calculateWorkHours = (checkIn, checkOut) => {
    const diff = checkOut - checkIn;
    return (diff / (1000 * 60 * 60)).toFixed(2); // Convert to hours
};

// Helper function to determine status
const determineStatus = (checkInTime) => {
    const checkIn = new Date(checkInTime);
    const hours = checkIn.getHours();
    const minutes = checkIn.getMinutes();

    // If check-in is after 9:00 AM, mark as Late
    if (hours > 9 || (hours === 9 && minutes > 0)) {
        return "Late";
    }
    return "Present";
};

const hasCompletedMinimumHours = (checkInTime) => {
    const now = new Date();
    return (now - new Date(checkInTime)) >= MIN_WORK_MS;
};


// EMPLOYEE ROUTES

// Check-In
router.post('/checkin', Authmiddlwhere, async (req, res) => {
    try {

        const today = getTodayDate();

        // Check if already checked in today
        const existingAttendance = await Attendance.findOne({
            user: req.user.id,
            date: today
        });

        if (existingAttendance) {
            return res.status(409).json({
                message: 'You have already checked in today',
                attendance: existingAttendance
            });
        }

        // Create new attendance record
        const checkInTime = new Date();
        const status = determineStatus(checkInTime);

        const attendance = await Attendance.create({
            user: req.user.id,
            date: today,
            checkIn: checkInTime,
            status: status
        });

        console.log(`✅ ${req.user.username} checked in at ${checkInTime.toLocaleTimeString()} - Status: ${status}`);

        return res.status(201).json({
            message: 'Checked in successfully',
            attendance
        });
    } catch (err) {
        console.error("Check-in error:", err.message);
        return res.status(500).json({ message: "Failed to check-in" });
    }
});

// Check-Out
router.post('/checkout', Authmiddlwhere, async (req, res) => {
    try {
        const today = getTodayDate();

        const attendance = await Attendance.findOne({
            user: req.user.id,
            date: today
        });

        if (!attendance) {
            return res.status(404).json({
                message: 'You have not checked in today'
            });
        }

        if (attendance.checkOut) {
            return res.status(409).json({
                message: 'You have already checked out today',
                attendance
            });
        }

        // 🔒 ENFORCE MINIMUM 4 HOURS
        if (!hasCompletedMinimumHours(attendance.checkIn)) {
            const remainingMs =
                MIN_WORK_MS - (new Date() - new Date(attendance.checkIn));

            return res.status(403).json({
                message: 'Minimum 4 working hours required before checkout',
                remainingMinutes: Math.ceil(remainingMs / (1000 * 60))
            });
        }

        // Proceed with checkout
        const checkOutTime = new Date();
        attendance.checkOut = checkOutTime;
        attendance.workHours = calculateWorkHours(
            attendance.checkIn,
            checkOutTime
        );

        // Status remains Present / Late
        await attendance.save();

        console.log(
            `✅ ${req.user.username} checked out at ${checkOutTime.toLocaleTimeString()} - Work Hours: ${attendance.workHours}`
        );

        return res.status(200).json({
            message: 'Checked out successfully',
            attendance
        });

    } catch (err) {
        console.error("Check-out error:", err.message);
        return res.status(500).json({
            message: "Failed to check-out"
        });
    }
});


// Mark Leave
router.post('/leave', Authmiddlwhere, async (req, res) => {
    try {

        const { date, reason } = req.body;

        if (!date || !reason) {
            return res.status(400).json({ message: 'Date and reason are required' });
        }

        // Check if already marked for this date
        const existingAttendance = await Attendance.findOne({
            user: req.user.id,
            date: date
        });

        if (existingAttendance) {
            return res.status(409).json({ message: 'Attendance already marked for this date' });
        }

        const attendance = await Attendance.create({
            user: req.user.id,
            date: date,
            checkIn: new Date(), // Placeholder
            status: "Leave",
            leaveReason: reason
        });

        return res.status(201).json({
            message: 'Leave marked successfully',
            attendance
        });
    } catch (err) {
        console.error("Mark leave error:", err.message);
        return res.status(500).json({ message: "Failed to mark leave" });
    }
});

// Get Employee's own attendance
router.get('/my-attendance', Authmiddlwhere, async (req, res) => {
    try {

        const { startDate, endDate } = req.query;

        let query = { user: req.user.id };

        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }

        const attendance = await Attendance.find(query)
            .sort({ date: -1 });

        return res.status(200).json({ attendance });
    } catch (err) {
        console.error("Fetch attendance error:", err.message);
        return res.status(500).json({ message: "Failed to fetch attendance" });
    }
});

// Get today's attendance status
router.get('/today', Authmiddlwhere, async (req, res) => {
    try {

        const today = getTodayDate();

        const attendance = await Attendance.findOne({
            user: req.user.id,
            date: today
        });

        return res.status(200).json({ attendance: attendance || null });
    } catch (err) {
        console.error("Fetch today attendance error:", err.message);
        return res.status(500).json({ message: "Failed to fetch today's attendance" });
    }
});

router.get('/status', Authmiddlwhere, async (req, res) => {
    try {
        const today = getTodayDate();

        const attendance = await Attendance.findOne({
            user: req.user.id,
            date: today
        });

        if (!attendance) {
            return res.status(200).json({
                isCheckedIn: false
            });
        }

        return res.status(200).json({
            isCheckedIn: true,
            checkedInAt: attendance.checkIn,
            hasCheckedOut: Boolean(attendance.checkOut)
        });

    } catch (err) {
        console.error("Fetch attendance status error:", err.message);
        return res.status(500).json({
            message: "Failed to fetch attendance status"
        });
    }
});


// MANAGER ROUTES

// Get all employees attendance
router.get('/all-employees', Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Manager") {
            return res.status(403).json({
                message: 'Only Managers can view employee attendance'
            });
        }

        const employees = await User.find({ role: "Employee" })
            .select('_id username email');

        const employeeIds = employees.map(emp => emp._id);

        const attendance = await Attendance.find({
            user: { $in: employeeIds }
        })
            .populate('user', 'username email role')
            .sort({ date: -1 });

        const fixedAttendance = attendance.map(a => ({
            ...a.toObject(),
            employee: a.user,   // <-- THIS LINE FIXES NAME
        }));

        return res.status(200).json({
            attendance: fixedAttendance,
            employees
        });

    } catch (err) {
        console.error("Fetch all employees attendance error:", err.message);
        return res.status(500).json({
            message: "Failed to fetch attendance"
        });
    }
});


// ADMIN ROUTES

// Get all managers attendance
router.get('/all-managers', Authmiddlwhere, AdminOnly, async (req, res) => {
    try {
        const { startDate, endDate, managerId } = req.query;

        // Only managers
        let userQuery = { role: "Manager" };
        if (managerId) {
            userQuery._id = managerId;
        }

        const managers = await User.find(userQuery).select('_id username email');
        const managerIds = managers.map(mgr => mgr._id);

        let attendanceQuery = { user: { $in: managerIds } };

        if (startDate && endDate) {
            attendanceQuery.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const attendance = await Attendance.find(attendanceQuery)
            .populate('user', 'username email role')
            .sort({ date: -1, checkIn: -1 });

        // ✅ FIX: map user → employee (same as manager route)
        const fixedAttendance = attendance.map(a => ({
            ...a.toObject(),
            employee: a.user,
        }));

        console.log(`✅ Admin fetched ${fixedAttendance.length} manager attendance records`);

        return res.status(200).json({
            attendance: fixedAttendance,
            managers,
        });

    } catch (err) {
        console.error("Fetch managers attendance error:", err.message);
        return res.status(500).json({
            message: "Failed to fetch attendance"
        });
    }
});


// Get attendance statistics
router.get('/stats', Authmiddlwhere, AdminOnly, async (req, res) => {
    try {
        const today = getTodayDate();

        const todayAttendance = await Attendance.find({ date: today })
            .populate('user', 'username role');

        const stats = {
            total: todayAttendance.length,
            present: todayAttendance.filter(a => a.status === "Present").length,
            late: todayAttendance.filter(a => a.status === "Late").length,
            halfDay: todayAttendance.filter(a => a.status === "Half-Day").length,
            leave: todayAttendance.filter(a => a.status === "Leave").length,
        };

        return res.status(200).json({ stats, todayAttendance });
    } catch (err) {
        console.error("Fetch stats error:", err.message);
        return res.status(500).json({
            message: "Failed to fetch statistics"
        });
    }
});


module.exports = router;