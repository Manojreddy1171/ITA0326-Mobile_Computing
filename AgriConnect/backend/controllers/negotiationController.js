const db = require("../db");

// =====================================================
// RULE-BASED NEGOTIATION RECOMMENDATION ENGINE
// =====================================================
/**
 * Generates transparent, fair price counteroffers based on:
 * - Asking price
 * - Offered price
 * - Requested bulk quantity
 * - Available stock
 * - Farmer-defined minimum floor price
 * - Market benchmark reference price
 */
function calculateRecommendation({
    askingPrice,
    offeredPrice,
    quantity,
    availableStock = 500,
    minAcceptablePrice = null,
    marketReferencePrice = null
}) {
    askingPrice = parseFloat(askingPrice);
    offeredPrice = parseFloat(offeredPrice);
    quantity = parseFloat(quantity);
    availableStock = parseFloat(availableStock || 500);

    // Default market reference price: around 95% of asking price if not provided
    if (!marketReferencePrice || isNaN(marketReferencePrice)) {
        marketReferencePrice = parseFloat((askingPrice * 0.96).toFixed(2));
    } else {
        marketReferencePrice = parseFloat(marketReferencePrice);
    }

    // Default farmer floor price: 80% of asking price
    if (!minAcceptablePrice || isNaN(minAcceptablePrice)) {
        minAcceptablePrice = parseFloat((askingPrice * 0.82).toFixed(2));
    } else {
        minAcceptablePrice = parseFloat(minAcceptablePrice);
    }

    // Volume discount weight (higher quantity = larger concession toward buyer's offer)
    let volumeDiscountWeight = 0.25;
    let volumeTierLabel = "Standard Volume (<50 kg)";

    if (quantity >= 500) {
        volumeDiscountWeight = 0.65;
        volumeTierLabel = "High-Volume Wholesale (≥500 kg)";
    } else if (quantity >= 200) {
        volumeDiscountWeight = 0.55;
        volumeTierLabel = "Large Wholesale (≥200 kg)";
    } else if (quantity >= 100) {
        volumeDiscountWeight = 0.50;
        volumeTierLabel = "Wholesale Batch (≥100 kg)";
    } else if (quantity >= 50) {
        volumeDiscountWeight = 0.35;
        volumeTierLabel = "Medium Wholesale (≥50 kg)";
    }

    // Blend asking price and buyer offer based on volume
    const priceGap = askingPrice - offeredPrice;
    let rawSuggestion = askingPrice - (priceGap * volumeDiscountWeight);

    // Anchor with market reference price (30% weight)
    let suggestedPrice = (rawSuggestion * 0.70) + (marketReferencePrice * 0.30);

    // Ensure price never drops below farmer's minimum floor price
    suggestedPrice = Math.max(minAcceptablePrice, Math.min(askingPrice, suggestedPrice));
    suggestedPrice = Math.round(suggestedPrice * 100) / 100;

    // Build transparent explanation
    const discountPct = Math.round(((askingPrice - suggestedPrice) / askingPrice) * 100);
    const reasoning = `Recommended fair price: ₹${suggestedPrice}/kg for ${quantity} kg (${volumeTierLabel}). ` +
        `This reflects a ${discountPct}% wholesale incentive from asking price ₹${askingPrice}/kg, ` +
        `aligned with current market reference ₹${marketReferencePrice}/kg and protecting farmer floor margin.`;

    return {
        suggestedPrice,
        askingPrice,
        offeredPrice,
        marketReferencePrice,
        minAcceptablePrice,
        quantity,
        discountPct,
        volumeTierLabel,
        reasoning
    };
}

// =====================================================
// INITIATE NEGOTIATION (BUYER)
// =====================================================
const createNegotiation = (req, res) => {
    const { crop_id, buyer_id, quantity, offered_price, notes } = req.body;

    if (!crop_id || !buyer_id || !quantity || !offered_price) {
        return res.status(400).json({
            success: false,
            message: "Crop ID, buyer ID, quantity, and offered price are required."
        });
    }

    // Verify crop exists and get details
    db.query(
        "SELECT id, farmer_id, crop_name, price_per_kg, quantity AS stock FROM crops WHERE id = ?",
        [crop_id],
        (cropErr, crops) => {
            if (cropErr || crops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Crop listing not found."
                });
            }

            const crop = crops[0];
            const askingPrice = parseFloat(crop.price_per_kg);
            const offeredPrice = parseFloat(offered_price);
            const qty = parseFloat(quantity);

            if (isNaN(offeredPrice) || offeredPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Offered price must be a positive number greater than zero."
                });
            }

            if (isNaN(qty) || qty <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Requested quantity must be a positive number greater than zero."
                });
            }

            if (crop.stock && qty > parseFloat(crop.stock)) {
                return res.status(400).json({
                    success: false,
                    message: `Requested quantity (${qty} kg) exceeds available stock (${crop.stock} kg).`
                });
            }

            // Compute reference and recommendation
            const marketRef = Math.round(askingPrice * 0.96);
            const minAcceptable = Math.round(askingPrice * 0.82);
            const recommendation = calculateRecommendation({
                askingPrice,
                offeredPrice,
                quantity: qty,
                availableStock: crop.stock,
                minAcceptablePrice: minAcceptable,
                marketReferencePrice: marketRef
            });

            const insertNegotiationSql = `
                INSERT INTO negotiations
                (crop_id, farmer_id, buyer_id, quantity, asking_price, offered_price, current_counter_price, market_reference_price, min_acceptable_price, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            `;

            db.query(
                insertNegotiationSql,
                [
                    crop_id,
                    crop.farmer_id,
                    buyer_id,
                    qty,
                    askingPrice,
                    offeredPrice,
                    offeredPrice,
                    marketRef,
                    minAcceptable,
                    notes || null
                ],
                (negErr, result) => {
                    if (negErr) {
                        console.error("Create negotiation error:", negErr);
                        return res.status(500).json({ success: false, message: "Failed to create negotiation." });
                    }

                    const negotiationId = result.insertId;

                    // 1. Log buyer's initial offer
                    const buyerMsgSql = `
                        INSERT INTO negotiation_messages
                        (negotiation_id, sender_id, sender_role, message_type, price, message)
                        VALUES (?, ?, 'buyer', 'offer', ?, ?)
                    `;
                    db.query(
                        buyerMsgSql,
                        [
                            negotiationId,
                            buyer_id,
                            offeredPrice,
                            notes ? `Initial offer: ₹${offeredPrice}/kg for ${qty} kg. Note: ${notes}` : `Initial offer: ₹${offeredPrice}/kg for ${qty} kg.`
                        ],
                        () => {}
                    );

                    // 2. Log system recommendation in timeline
                    const sysMsgSql = `
                        INSERT INTO negotiation_messages
                        (negotiation_id, sender_id, sender_role, message_type, price, message)
                        VALUES (?, 0, 'system', 'system_suggestion', ?, ?)
                    `;
                    db.query(
                        sysMsgSql,
                        [negotiationId, recommendation.suggestedPrice, recommendation.reasoning],
                        () => {}
                    );

                    // 3. Send notification to farmer
                    const notifSql = `
                        INSERT INTO notifications (user_id, title, message, type)
                        VALUES (?, 'New Wholesale Offer', ?, 'order')
                    `;
                    db.query(
                        notifSql,
                        [crop.farmer_id, `A buyer offered ₹${offeredPrice}/kg for ${qty} kg of ${crop.crop_name}.`],
                        () => {}
                    );

                    return res.status(201).json({
                        success: true,
                        message: "Wholesale price negotiation initiated successfully.",
                        negotiation_id: negotiationId,
                        recommendation
                    });
                }
            );
        }
    );
};

// =====================================================
// GET NEGOTIATIONS LIST FOR USER
// =====================================================
const getNegotiations = (req, res) => {
    const { user_id, role, status } = req.query;

    if (!user_id) {
        return res.status(400).json({ success: false, message: "user_id is required." });
    }

    let filterSql = "";
    const params = [];

    if (role === "farmer") {
        filterSql = "WHERE n.farmer_id = ?";
        params.push(user_id);
    } else if (role === "buyer") {
        filterSql = "WHERE n.buyer_id = ?";
        params.push(user_id);
    } else {
        filterSql = "WHERE (n.farmer_id = ? OR n.buyer_id = ?)";
        params.push(user_id, user_id);
    }

    if (status) {
        filterSql += " AND n.status = ?";
        params.push(status);
    }

    const sql = `
        SELECT
            n.*,
            c.crop_name,
            c.specific_name,
            c.image AS crop_image,
            c.quantity AS crop_stock,
            farmer.first_name AS farmer_first_name,
            farmer.last_name AS farmer_last_name,
            buyer.first_name AS buyer_first_name,
            buyer.last_name AS buyer_last_name,
            (SELECT COUNT(*) FROM negotiation_messages WHERE negotiation_id = n.id) AS message_count
        FROM negotiations n
        JOIN crops c ON n.crop_id = c.id
        JOIN users farmer ON n.farmer_id = farmer.id
        JOIN users buyer ON n.buyer_id = buyer.id
        ${filterSql}
        ORDER BY n.updated_at DESC
    `;

    db.query(sql, params, (err, rows) => {
        if (err) {
            console.error("Get negotiations error:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch negotiations." });
        }
        res.json({ success: true, negotiations: rows });
    });
};

// =====================================================
// GET SINGLE NEGOTIATION WITH TIMELINE
// =====================================================
const getNegotiationById = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT
            n.*,
            c.crop_name,
            c.specific_name,
            c.image AS crop_image,
            c.quantity AS crop_stock,
            farmer.first_name AS farmer_first_name,
            farmer.last_name AS farmer_last_name,
            farmer.phone AS farmer_phone,
            buyer.first_name AS buyer_first_name,
            buyer.last_name AS buyer_last_name,
            buyer.phone AS buyer_phone
        FROM negotiations n
        JOIN crops c ON n.crop_id = c.id
        JOIN users farmer ON n.farmer_id = farmer.id
        JOIN users buyer ON n.buyer_id = buyer.id
        WHERE n.id = ?
    `;

    db.query(sql, [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Negotiation not found." });
        }

        const negotiation = rows[0];

        // Fetch messages timeline
        const msgSql = `
            SELECT
                nm.*,
                u.first_name,
                u.last_name
            FROM negotiation_messages nm
            LEFT JOIN users u ON nm.sender_id = u.id
            WHERE nm.negotiation_id = ?
            ORDER BY nm.created_at ASC
        `;

        db.query(msgSql, [id], (msgErr, messages) => {
            if (msgErr) {
                return res.status(500).json({ success: false, message: "Failed to fetch timeline." });
            }

            // Fresh recommendation advice
            const recommendation = calculateRecommendation({
                askingPrice: negotiation.asking_price,
                offeredPrice: negotiation.current_counter_price || negotiation.offered_price,
                quantity: negotiation.quantity,
                availableStock: negotiation.crop_stock,
                minAcceptablePrice: negotiation.min_acceptable_price,
                marketReferencePrice: negotiation.market_reference_price
            });

            res.json({
                success: true,
                negotiation,
                timeline: messages,
                recommendation
            });
        });
    });
};

// =====================================================
// SUBMIT COUNTEROFFER (FARMER OR BUYER)
// =====================================================
const submitCounteroffer = (req, res) => {
    const { id } = req.params;
    const { sender_id, sender_role, counter_price, message } = req.body;

    if (!sender_id || !sender_role || !counter_price) {
        return res.status(400).json({
            success: false,
            message: "Sender ID, role, and counter price are required."
        });
    }

    const counterPrice = parseFloat(counter_price);

    if (isNaN(counterPrice) || counterPrice <= 0) {
        return res.status(400).json({
            success: false,
            message: "Counter price must be a positive number greater than zero."
        });
    }

    // Fetch current negotiation
    db.query("SELECT * FROM negotiations WHERE id = ?", [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Negotiation not found." });
        }

        const neg = rows[0];

        if (["accepted", "rejected", "cancelled", "expired"].includes(neg.status)) {
            return res.status(400).json({
                success: false,
                message: `Negotiation is already ${neg.status} and cannot be countered.`
            });
        }

        if (sender_role === "farmer" && neg.farmer_id != sender_id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: only the crop owner farmer can submit a counteroffer."
            });
        }

        if (sender_role === "buyer" && neg.buyer_id != sender_id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: only the negotiating buyer can submit a counteroffer."
            });
        }

        // Update negotiation record
        const updateSql = `
            UPDATE negotiations
            SET current_counter_price = ?, status = 'counteroffer_received', updated_at = NOW()
            WHERE id = ?
        `;

        db.query(updateSql, [counterPrice, id], (updErr) => {
            if (updErr) {
                return res.status(500).json({ success: false, message: "Failed to update counteroffer." });
            }

            // Log timeline event
            const msgSql = `
                INSERT INTO negotiation_messages
                (negotiation_id, sender_id, sender_role, message_type, price, message)
                VALUES (?, ?, ?, 'counteroffer', ?, ?)
            `;

            const noteText = message || `${sender_role === 'farmer' ? 'Farmer' : 'Buyer'} proposed counteroffer: ₹${counterPrice}/kg.`;

            db.query(msgSql, [id, sender_id, sender_role, counterPrice, noteText], () => {});

            // Notify recipient
            const recipientId = sender_role === "farmer" ? neg.buyer_id : neg.farmer_id;
            const notifSql = `
                INSERT INTO notifications (user_id, title, message, type)
                VALUES (?, 'Counteroffer Received', ?, 'order')
            `;
            db.query(
                notifSql,
                [recipientId, `${sender_role === 'farmer' ? 'Farmer' : 'Buyer'} proposed ₹${counterPrice}/kg for your negotiation.`],
                () => {}
            );

            res.json({
                success: true,
                message: "Counteroffer submitted successfully.",
                current_counter_price: counterPrice
            });
        });
    });
};

// =====================================================
// ACCEPT NEGOTIATION
// =====================================================
const acceptNegotiation = (req, res) => {
    const { id } = req.params;
    const { user_id, user_role } = req.body;

    db.query("SELECT * FROM negotiations WHERE id = ?", [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Negotiation not found." });
        }

        const neg = rows[0];

        if (neg.status === "accepted") {
            return res.status(400).json({
                success: false,
                message: "Negotiation is already accepted."
            });
        }

        if (["rejected", "cancelled", "expired"].includes(neg.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot accept negotiation with status '${neg.status}'.`
            });
        }

        const finalPrice = neg.current_counter_price || neg.offered_price;

        const updateSql = `
            UPDATE negotiations
            SET status = 'accepted', final_agreed_price = ?, updated_at = NOW()
            WHERE id = ?
        `;

        db.query(updateSql, [finalPrice, id], (updErr) => {
            if (updErr) {
                return res.status(500).json({ success: false, message: "Failed to accept negotiation." });
            }

            // Log accept event
            const msgSql = `
                INSERT INTO negotiation_messages
                (negotiation_id, sender_id, sender_role, message_type, price, message)
                VALUES (?, ?, ?, 'accept', ?, ?)
            `;
            db.query(
                msgSql,
                [id, user_id, user_role, finalPrice, `Price agreed at ₹${finalPrice}/kg for ${neg.quantity} kg! Final deal accepted.`],
                () => {}
            );

            // Notify both parties
            const otherPartyId = user_role === "farmer" ? neg.buyer_id : neg.farmer_id;
            const notifSql = `
                INSERT INTO notifications (user_id, title, message, type)
                VALUES (?, 'Negotiation Accepted!', ?, 'order')
            `;
            db.query(
                notifSql,
                [otherPartyId, `Negotiation #${id} has been accepted at ₹${finalPrice}/kg!`],
                () => {}
            );

            res.json({
                success: true,
                message: `Negotiation accepted at ₹${finalPrice}/kg.`,
                final_agreed_price: finalPrice
            });
        });
    });
};

// =====================================================
// REJECT NEGOTIATION
// =====================================================
const rejectNegotiation = (req, res) => {
    const { id } = req.params;
    const { user_id, user_role, reason } = req.body;

    db.query("SELECT * FROM negotiations WHERE id = ?", [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Negotiation not found." });
        }

        const neg = rows[0];

        const updateSql = `
            UPDATE negotiations
            SET status = 'rejected', updated_at = NOW()
            WHERE id = ?
        `;

        db.query(updateSql, [id], (updErr) => {
            if (updErr) {
                return res.status(500).json({ success: false, message: "Failed to reject negotiation." });
            }

            const msgSql = `
                INSERT INTO negotiation_messages
                (negotiation_id, sender_id, sender_role, message_type, price, message)
                VALUES (?, ?, ?, 'reject', NULL, ?)
            `;
            const rejectMsg = reason ? `Negotiation ended/rejected. Reason: ${reason}` : "Negotiation was rejected.";

            db.query(msgSql, [id, user_id, user_role, rejectMsg], () => {});

            res.json({ success: true, message: "Negotiation has been rejected." });
        });
    });
};

// =====================================================
// CONVERT ACCEPTED NEGOTIATION TO ORDER
// =====================================================
const convertToOrder = (req, res) => {
    const { id } = req.params;
    const { buyer_id, delivery_address } = req.body;

    db.query("SELECT * FROM negotiations WHERE id = ?", [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Negotiation not found." });
        }

        const neg = rows[0];

        if (neg.status !== "accepted") {
            return res.status(400).json({
                success: false,
                message: "Only accepted negotiations can be converted to confirmed orders."
            });
        }

        const finalPrice = neg.final_agreed_price;
        const totalAmount = parseFloat(finalPrice) * parseFloat(neg.quantity);

        const orderSql = `
            INSERT INTO orders
            (buyer_id, crop_id, quantity, total_price, status)
            VALUES (?, ?, ?, ?, 'pending')
        `;

        db.query(orderSql, [neg.buyer_id, neg.crop_id, neg.quantity, totalAmount], (orderErr, orderResult) => {
            if (orderErr) {
                console.error("Order creation from negotiation error:", orderErr);
                return res.status(500).json({ success: false, message: "Failed to generate order." });
            }

            // Deduct stock from crops table
            db.query("UPDATE crops SET quantity = GREATEST(0, quantity - ?) WHERE id = ?", [neg.quantity, neg.crop_id]);

            res.status(201).json({
                success: true,
                message: "Order successfully generated from negotiated agreement!",
                order_id: orderResult.insertId,
                total_amount: totalAmount
            });
        });
    });
};

// =====================================================
// GET RECOMMENDATION CALCULATION (API)
// =====================================================
const getRecommendation = (req, res) => {
    const { asking_price, offered_price, quantity, market_reference_price, min_acceptable_price } = req.query;

    if (!asking_price || !offered_price || !quantity) {
        return res.status(400).json({
            success: false,
            message: "asking_price, offered_price, and quantity are required query parameters."
        });
    }

    const result = calculateRecommendation({
        askingPrice: asking_price,
        offeredPrice: offered_price,
        quantity,
        marketReferencePrice: market_reference_price,
        minAcceptablePrice: min_acceptable_price
    });

    res.json({ success: true, recommendation: result });
};

module.exports = {
    createNegotiation,
    getNegotiations,
    getNegotiationById,
    submitCounteroffer,
    acceptNegotiation,
    rejectNegotiation,
    convertToOrder,
    getRecommendation
};
