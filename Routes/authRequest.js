const express = require('express')
const router = express.Router();
const { Authmiddlwhere, AdminOnly } = require('../middlewhere/Authmiddlewhere')
const Request = require('../Schemas/Request');
const User = require('../Schemas/User');
const { createNotification, notificationTemplates } = require('../utils/notificationHelper');
const getIo = (req) => req.app.get('io');

//  EMPLOYEE ROUTES

router.post('/create', Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Employee") {
            return res.status(403).json({ 'message': 'Only Employees can create requests' })
        }
        const request = await Request.create({
            title: req.body.title,
            description: req.body.description,
            createdBy: req.user.id
        })

        res.status(201).json({ request })
    }
    catch (err) {
        console.error("Create request error:", err.message);
        return res.status(500).json({ message: "Failed to create request" });
    }
})

// 🔔 1. WHEN EMPLOYEE SUBMITS REQUEST - NOTIFY MANAGER & ADMIN
router.post('/:id/submit', Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Employee") {
            return res.status(403).json({ 'message': 'Only Employees can submit requests' })
        }

        const request = await Request.findById(req.params.id)
        if (!request) {
            return res.status(404).json({ 'message': 'Request not found' })
        }

        if (request.createdBy.toString() !== req.user.id) {
            return res.status(409).json({ 'message': 'You can submit your own request only!!' })
        }

        // Allow submit for DRAFT and WITHDRAWN requests
        if (request.status !== "DRAFT" && request.status !== "WITHDRAWN") {
            return res.status(409).json({
                'message': 'Only Draft or Withdrawn requests can be submitted',
                status: request.status
            })
        }

        request.status = "SUBMITTED"
        await request.save()

        // 🔔 NOTIFY ALL MANAGERS AND ADMINS
        const managersAndAdmins = await User.find({
            role: { $in: ['Manager', 'Admin'] }
        }).select('_id');

        const template = notificationTemplates.REQUEST_SUBMITTED(request.title, req.user.username);

        for (const user of managersAndAdmins) {
            await createNotification({
                recipient: user._id,
                sender: req.user.id,
                type: 'REQUEST_SUBMITTED',
                title: template.title,
                message: template.message,
                relatedRequest: request._id,
                link: user.role === 'Manager' ? '/manager' : '/admin',
                io: getIo(req) 
            });
        }

        return res.status(201).json({ 'message': 'Request submitted successfully' })
    } catch (err) {
        console.error("Submit request error:", err.message);
        return res.status(500).json({ message: "Failed to submit request" });
    }
})

router.post('/:id/withdraw', Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Employee") {
            return res.status(403).json({ 'message': 'Only Employees can withdraw requests' })
        }

        const request = await Request.findById(req.params.id)

        if (!request) {
            return res.status(404).json({ 'message': 'Request not found' })
        }

        if (request.status !== "SUBMITTED") {
            return res.status(409).json({ 'message': 'You can only withdraw the submitted requests!' })
        }

        request.status = "WITHDRAWN"
        await request.save()

        return res.status(201).json({ 'message': 'Request is successfully withdrawn' })
    } catch (err) {
        console.error("Withdraw request error:", err.message);
        return res.status(500).json({ message: "Failed to withdraw request" });
    }
})

// Get all requests for the logged-in employee
router.get('/myrequests', Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Employee") {
            return res.status(403).json({ 'message': 'Only Employees can see their requests' })
        }

        const requests = await Request.find({ createdBy: req.user.id })
            .sort({ createdAt: -1 }); // Sort by newest first

        return res.status(200).json({ requests })
    } catch (err) {
        console.error("Fetch my requests error:", err.message);
        return res.status(500).json({ message: "Failed to fetch requests" });
    }
})

// MANAGER ROUTES

router.get('/pending', Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Manager") {
            return res.status(403).json({ 'message': 'Only Managers can view requests' })
        }

        // Fetch requests that Manager should see
        const requests = await Request.find()
            .populate("createdBy", "username email role")
            .sort({ createdAt: -1 }); // Sort by newest first

        return res.status(200).json({ requests });
    } catch (err) {
        console.error("❌ Fetch manager requests error:", err.message);
        return res.status(500).json({ message: "Failed to fetch requests" });
    }
})

// 🔔 2. WHEN MANAGER APPROVES - NOTIFY EMPLOYEE & ADMIN
router.post("/:id/approve", Authmiddlwhere, async (req, res) => {
    try {
        console.log('🔵 Approve route hit');

        if (req.user.role !== "Manager") {
            return res.status(403).json({ message: "Only managers can approve requests" });
        }

        const request = await Request.findById(req.params.id)
            .populate('createdBy', '_id username');

        console.log('🔵 Request found:', request._id);
        console.log('🔵 Created by:', request.createdBy);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.status !== "SUBMITTED" && request.status !== "REOPENED") {
            return res.status(400).json({ message: "Only submitted requests can be approved" });
        }

        request.status = "APPROVED";
        request.reviewedBy = req.user.id;
        request.reviewedAt = new Date();
        await request.save();

        console.log('🔵 Creating notification...');
        console.log('🔵 Recipient:', request.createdBy._id);
        console.log('🔵 Sender:', req.user.id);

        // 🔔 CREATE NOTIFICATION
        try {
            const template = notificationTemplates.REQUEST_APPROVED(request.title, req.user.username);

            const notification = await createNotification({
                recipient: request.createdBy._id,
                sender: req.user.id,
                type: 'REQUEST_APPROVED',
                title: template.title,
                message: template.message,
                relatedRequest: request._id,
                link: `/employee/my-requests`,
                io: getIo(req) 
            });

            console.log('✅ Notification created successfully:', notification._id);
        } catch (notifError) {
            console.error('❌ NOTIFICATION ERROR:', notifError);
        }

        res.json({ message: "Request approved successfully", request });
    } catch (error) {
        console.error('❌ Error approving request:', error);
        res.status(500).json({ message: "Failed to approve request", error: error.message });
    }
});

// 🔔 3. WHEN MANAGER REJECTS - NOTIFY EMPLOYEE & ADMIN
router.post("/:id/reject", Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Manager") {
            return res.status(403).json({ message: "Only managers can reject requests" });
        }

        const request = await Request.findById(req.params.id)
            .populate('createdBy', '_id username');

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.status !== "SUBMITTED" && request.status !== "REOPENED") {
            return res.status(400).json({ message: "Only submitted requests can be rejected" });
        }

        request.status = "REJECTED";
        request.reviewedBy = req.user.id;
        request.reviewedAt = new Date();
        await request.save();

        const template = notificationTemplates.REQUEST_REJECTED(request.title, req.user.username);

        // 🔔 NOTIFY EMPLOYEE WHO CREATED THE REQUEST
        await createNotification({
            recipient: request.createdBy._id,
            sender: req.user.id,
            type: 'REQUEST_REJECTED',
            title: template.title,
            message: template.message,
            relatedRequest: request._id,
            link: `/employee/my-requests`,
            io: getIo(req) 
        });

        // 🔔 NOTIFY ALL ADMINS
        const admins = await User.find({ role: 'Admin' }).select('_id');

        for (const admin of admins) {
            await createNotification({
                recipient: admin._id,
                sender: req.user.id,
                type: 'REQUEST_REJECTED',
                title: '❌ Request Rejected',
                message: `${req.user.username} rejected request: "${request.title}" by ${request.createdBy.username}`,
                relatedRequest: request._id,
                link: '/admin',
                io: getIo(req) 
            });
        }

        res.json({ message: "Request rejected successfully", request });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ message: "Failed to reject request", error: error.message });
    }
});

// ADMIN ROUTES

router.get('/all', Authmiddlwhere, AdminOnly, async (req, res) => {
    try {
        const requests = await Request.find()
            .populate("createdBy", "username email role")
            .sort({ createdAt: -1 }); // Sort by newest first

        return res.status(200).json({ requests });
    } catch (err) {
        console.error("Fetch all requests error:", err.message);
        return res.status(500).json({
            message: "Failed to fetch all requests"
        });
    }
});

// 🔔 4. WHEN ADMIN CLOSES REQUEST - NOTIFY EMPLOYEE & MANAGER
router.post('/:id/close', Authmiddlwhere, AdminOnly, async (req, res) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('createdBy', '_id username')
            .populate('reviewedBy', '_id username');

        if (!request) {
            return res.status(404).json({ 'message': 'Request not found' })
        }

        if (
            request.status !== "APPROVED" &&
            request.status !== "REJECTED"
        ) {
            return res.status(409).json({ 'message': 'Only Approved or Rejected requests can be closed!!' })
        }

        request.status = "CLOSED"
        await request.save()

        const template = notificationTemplates.REQUEST_CLOSED(request.title, req.user.username);

        // 🔔 NOTIFY EMPLOYEE WHO CREATED THE REQUEST
        await createNotification({
            recipient: request.createdBy._id,
            sender: req.user.id,
            type: 'REQUEST_CLOSED',
            title: template.title,
            message: template.message,
            relatedRequest: request._id,
            link: `/employee/my-requests`,
            io: getIo(req) 
        });

        // 🔔 NOTIFY ALL MANAGERS
        const managers = await User.find({ role: 'Manager' }).select('_id');

        for (const manager of managers) {
            await createNotification({
                recipient: manager._id,
                sender: req.user.id,
                type: 'REQUEST_CLOSED',
                title: '🔒 Request Closed',
                message: `Admin closed request: "${request.title}" by ${request.createdBy.username}`,
                relatedRequest: request._id,
                link: '/manager',
                io: getIo(req) 
            });
        }

        return res.status(201).json({ 'message': 'Request closed successfully' })
    } catch (err) {
        console.error("Close request error:", err.message);
        return res.status(500).json({ message: "Failed to close request" });
    }
})

// 🔔 5. WHEN ADMIN REOPENS REQUEST - NOTIFY EMPLOYEE & MANAGER
router.post('/:id/reopen', Authmiddlwhere, AdminOnly, async (req, res) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('createdBy', '_id username');

        if (!request) {
            return res.status(404).json({ 'message': 'Request not found' })
        }

        if (request.status !== "CLOSED") {
            return res.status(409).json({ 'message': 'Only closed requests can be reopened.' })
        }

        // Change status to SUBMITTED so Manager can approve/reject again
        request.status = "SUBMITTED"
        await request.save()

        const template = notificationTemplates.REQUEST_REOPENED(request.title, req.user.username);

        // 🔔 NOTIFY EMPLOYEE WHO CREATED THE REQUEST
        await createNotification({
            recipient: request.createdBy._id,
            sender: req.user.id,
            type: 'REQUEST_REOPENED',
            title: template.title,
            message: template.message,
            relatedRequest: request._id,
            link: `/employee/my-requests`,
            io: getIo(req) 
        });

        // 🔔 NOTIFY ALL MANAGERS
        const managers = await User.find({ role: 'Manager' }).select('_id');

        for (const manager of managers) {
            await createNotification({
                recipient: manager._id,
                sender: req.user.id,
                type: 'REQUEST_REOPENED',
                title: '🔓 Request Reopened',
                message: `Admin reopened request: "${request.title}" by ${request.createdBy.username} for review`,
                relatedRequest: request._id,
                link: '/manager',
                io: getIo(req) 
            });
        }

        return res.status(201).json({ 'message': 'Request reopened and sent back for review' })
    } catch (err) {
        console.error("Reopening request error:", err.message);
        return res.status(500).json({ message: "Failed to reopen request" });
    }
})

module.exports = router