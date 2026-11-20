const express = require("express");
const router = express.Router();
const {
    getCampaigns,
    getCampaignById,
    createCampaign,
    joinCampaign,
    getBuyerCommitments,
    getSmartRecommendations
} = require("../controllers/groupBuyingController");

// Smart recommendations
router.get("/recommendations", getSmartRecommendations);

// Buyer's committed purchases
router.get("/my-commitments/:buyer_id", getBuyerCommitments);

// Campaign endpoints
router.get("/", getCampaigns);
router.post("/", createCampaign);
router.get("/:id", getCampaignById);
router.post("/:id/join", joinCampaign);

module.exports = router;
