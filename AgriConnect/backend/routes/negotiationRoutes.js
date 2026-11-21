const express = require("express");
const router = express.Router();
const {
    createNegotiation,
    getNegotiations,
    getNegotiationById,
    submitCounteroffer,
    acceptNegotiation,
    rejectNegotiation,
    convertToOrder,
    getRecommendation
} = require("../controllers/negotiationController");

// Query smart advice / recommendation
router.get("/recommendation", getRecommendation);

// Negotiation CRUD & actions
router.post("/", createNegotiation);
router.get("/", getNegotiations);
router.get("/:id", getNegotiationById);
router.post("/:id/counter", submitCounteroffer);
router.post("/:id/accept", acceptNegotiation);
router.post("/:id/reject", rejectNegotiation);
router.post("/:id/cancel", rejectNegotiation);
router.post("/:id/create-order", convertToOrder);

module.exports = router;
