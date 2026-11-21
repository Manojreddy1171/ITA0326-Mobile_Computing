const express = require("express");
const router = express.Router();
const {
    getCampaigns,
    getCampaignById,
    createCampaign,
    joinCampaign,
    cancelCommitment,
    getBuyerCommitments,
    getSmartRecommendations
} = require("../controllers/groupBuyingController");

// Smart recommendations
router.get("/recommendations", getSmartRecommendations);

// Buyer's committed purchases
router.get("/my-commitments/:buyer_id", getBuyerCommitments);
router.post("/commitments/:id/cancel", cancelCommitment);

// Campaign endpoints
router.get("/", getCampaigns);
router.get("/campaigns", getCampaigns);
router.get("/campaigns/:id", getCampaignById);
router.post("/", createCampaign);
router.get("/:id", getCampaignById);
router.post("/:id/join", joinCampaign);

module.exports = router;
