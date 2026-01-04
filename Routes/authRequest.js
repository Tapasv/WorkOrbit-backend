const express = require('express')
const router = express.Router();
const { Authmiddlwhere, AdminOnly } = require('../middlewhere/Authmiddlewhere')
const Request = require('../Schemas/Request');

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

        return res.status(201).json({ 'message': 'Request submitted successfully' })
    } catch (err) {
        console.error("Submit request error:", err.message);
        return res.status(500).json({ message: "Failed to submit request" });
    }
})

router.post('/:id/withdraw', Authmiddlwhere, async (req, res) => {
    try{
        if (req.user.role !== "Employee") {
            return res.status(403).json({ 'message': 'Only Employees can withdraw requests' })
        }

        const request = await Request.findById(req.params.id)

        if(!request) {
            return res.status(404).json({'message': 'Request not found'})
        }

        if(request.status !== "SUBMITTED") {
            return res.status(409).json({'message': 'You can only withdraw the submitted requests!'})
        }

        request.status = "WITHDRAWN"
        await request.save()

        return res.status(201).json({'message': 'Request is successfully withdrawn'})
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

router.post('/:id/approve', Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Manager") {
            return res.status(403).json({ 'message': 'Only Managers can approve requests' })
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ 'message': 'Request not found' })
        }

        if (request.status !== "SUBMITTED") {
            return res.status(409).json({ 'message': 'Only submitted requests can be approved/rejected' })
        }

        request.status = "APPROVED"
        await request.save()

        return res.status(201).json({ 'message': 'Request Approved' })
    } catch (err) {
        console.error("Approve request error:", err.message);
        return res.status(500).json({ message: "Failed to approve request" });
    }
})

router.post('/:id/reject', Authmiddlwhere, async (req, res) => {
    try {
        if (req.user.role !== "Manager") {
            return res.status(403).json({ 'message': 'Only Managers can reject requests' })
        }

        const request = await Request.findById(req.params.id)

        if (!request) {
            return res.status(404).json({ 'message': 'Request not found' })
        }

        if (request.status !== "SUBMITTED") {
            return res.status(409).json({ 'message': 'Only submitted requests can be approved/rejected' })
        }

        request.status = "REJECTED"
        await request.save()
        return res.status(201).json({ 'message': 'Request Rejected' })
    } catch (err) {
        console.error("Reject request error:", err.message);
        return res.status(500).json({ message: "Failed to reject request" });
    }
})

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

router.post('/:id/close', Authmiddlwhere, AdminOnly, async (req, res) => {
    try {
        const request = await Request.findById(req.params.id)

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

        return res.status(201).json({ 'message': 'Request closed successfully' })
    } catch (err) {
        console.error("Close request error:", err.message);
        return res.status(500).json({ message: "Failed to close request" });
    }
})

// FIXED: Reopen changes status back to SUBMITTED so Manager can review again
router.post('/:id/reopen', Authmiddlwhere, AdminOnly, async (req, res) => {
    try{
        const request = await Request.findById(req.params.id)

        if(!request) {
            return res.status(404).json({'message': 'Request not found'})
        }

        if(request.status !== "CLOSED") {
            return res.status(409).json({'message': 'Only closed requests can be reopened.'})
        }

        // Change status to SUBMITTED so Manager can approve/reject again
        request.status = "SUBMITTED"
        await request.save()

        return res.status(201).json({'message': 'Request reopened and sent back for review'})
    } catch (err) {
        console.error("Reopening request error:", err.message);
        return res.status(500).json({ message: "Failed to reopen request" });
    }
})

module.exports = router