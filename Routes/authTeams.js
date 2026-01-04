const express = require('express');
const router = express.Router();
const { Authmiddlwhere, AdminOnly } = require('../middlewhere/Authmiddlewhere');
const Team = require('../Schemas/Team');
const User = require('../Schemas/User');

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE dynamic /:id routes

// Get all employees (for adding to teams)
router.get("/users/employees", Authmiddlwhere, async (req, res) => {
  try {
    if (req.user.role !== "Manager" && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const users = await User.find({ role: "Employee" })
      .select("_id username email");

    res.json({ users });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: "Failed to fetch employees", error: error.message });
  }
});

// Get all teams (Admin only)
router.get("/admin/all", Authmiddlwhere, AdminOnly, async (req, res) => {
  try {
    const teams = await Team.find()
      .populate("manager", "username email role")
      .populate("members", "username email role")
      .sort({ createdAt: -1 });

    res.json({ teams });
  } catch (error) {
    console.error('Error fetching all teams:', error);
    res.status(500).json({ message: "Failed to fetch teams", error: error.message });
  }
});

// Get manager's teams
router.get("/my-teams", Authmiddlwhere, async (req, res) => {
  try {
    if (req.user.role !== "Manager") {
      return res.status(403).json({ message: "Only managers allowed" });
    }

    const teams = await Team.find({ manager: req.user.id })
      .populate("members", "username email role")
      .populate("manager", "username email");

    res.json({ teams });
  } catch (error) {
    console.error('Error fetching manager teams:', error);
    res.status(500).json({ message: "Failed to fetch teams", error: error.message });
  }
});

// Create a new team (Manager only)
router.post("/create-team", Authmiddlwhere, async (req, res) => {
  try {
    if (req.user.role !== "Manager") {
      return res.status(403).json({ message: "Only managers can create teams" });
    }

    const { name, members } = req.body;

    // Validate members exist
    if (members && members.length > 0) {
      const validMembers = await User.find({ 
        _id: { $in: members }, 
        role: "Employee" 
      });
      
      if (validMembers.length !== members.length) {
        return res.status(400).json({ message: "Some members are invalid or not employees" });
      }
    }

    const team = await Team.create({
      name,
      manager: req.user.id,
      members: members || []
    });

    const populatedTeam = await Team.findById(team._id)
      .populate("members", "username email")
      .populate("manager", "username email");

    res.status(201).json({ 
      message: "Team created successfully",
      team: populatedTeam 
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: "Failed to create team", error: error.message });
  }
});

// Get single team details (MUST come after specific routes)
router.get("/:id", Authmiddlwhere, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("members", "username email role")
      .populate("manager", "username email");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check permissions
    if (req.user.role === "Manager" && team.manager._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own teams" });
    }

    if (req.user.role !== "Manager" && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({ team });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ message: "Failed to fetch team", error: error.message });
  }
});

// Update team (Manager only - their own team)
router.put("/:id", Authmiddlwhere, async (req, res) => {
  try {
    if (req.user.role !== "Manager") {
      return res.status(403).json({ message: "Only managers allowed" });
    }

    const team = await Team.findOne({
      _id: req.params.id,
      manager: req.user.id
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found or you don't have permission" });
    }

    const { name, members } = req.body;

    // Validate members if provided
    if (members) {
      const validMembers = await User.find({ 
        _id: { $in: members }, 
        role: "Employee" 
      });
      
      if (validMembers.length !== members.length) {
        return res.status(400).json({ message: "Some members are invalid or not employees" });
      }
      team.members = members;
    }

    if (name) {
      team.name = name;
    }

    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate("members", "username email role")
      .populate("manager", "username email");

    res.json({ 
      message: "Team updated successfully",
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ message: "Failed to update team", error: error.message });
  }
});

// Delete team (Manager only - their own team)
router.delete("/:id", Authmiddlwhere, async (req, res) => {
  try {
    if (req.user.role !== "Manager") {
      return res.status(403).json({ message: "Only managers allowed" });
    }

    const team = await Team.findOneAndDelete({
      _id: req.params.id,
      manager: req.user.id
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found or you don't have permission" });
    }

    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: "Failed to delete team", error: error.message });
  }
});

module.exports = router;