const db = require("../db");

// =====================================================
// GET ACTIVE GROUP BUYING CAMPAIGNS (MARKETPLACE)
// =====================================================
const getCampaigns = (req, res) => {
    const { status, farmer_id, buyer_id, filter } = req.query;

    let whereClause = "WHERE 1=1";
    const params = [];

    if (farmer_id) {
        whereClause += " AND gbc.farmer_id = ?";
        params.push(farmer_id);
    } else if (status) {
        whereClause += " AND gbc.status = ?";
        params.push(status);
    } else {
        // Default: active and target_reached campaigns for buyers
        whereClause += " AND gbc.status IN ('active', 'target_reached')";
    }

    const sql = `
        SELECT
            gbc.*,
            c.crop_name,
            c.specific_name,
            c.image AS crop_image,
            farmer.first_name AS farmer_first_name,
            farmer.last_name AS farmer_last_name,
            farmer.address AS farmer_location,
            (SELECT COUNT(DISTINCT buyer_id) FROM group_buying_commitments WHERE campaign_id = gbc.id AND status = 'committed') AS participant_count,
            ROUND(((gbc.original_price - gbc.group_price) / gbc.original_price) * 100) AS discount_percentage,
            ROUND((gbc.current_committed_quantity / gbc.min_target_quantity) * 100, 1) AS progress_percentage,
            GREATEST(0, gbc.min_target_quantity - gbc.current_committed_quantity) AS remaining_to_target,
            GREATEST(0, gbc.max_available_quantity - gbc.current_committed_quantity) AS remaining_stock
        FROM group_buying_campaigns gbc
        JOIN crops c ON gbc.crop_id = c.id
        JOIN users farmer ON gbc.farmer_id = farmer.id
        ${whereClause}
        ORDER BY
            CASE WHEN gbc.status = 'active' AND (gbc.current_committed_quantity / gbc.min_target_quantity) >= 0.7 THEN 1 ELSE 2 END,
            gbc.created_at DESC
    `;

    db.query(sql, params, (err, rows) => {
        if (err) {
            console.error("Get campaigns error:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch campaigns." });
        }

        // Add countdown & recommendation metadata
        const campaigns = rows.map((c) => {
            const now = new Date();
            const end = new Date(c.end_date);
            const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
            const isNearTarget = c.progress_percentage >= 70 && c.progress_percentage < 100;
            const isTargetReached = c.current_committed_quantity >= c.min_target_quantity;

            return {
                ...c,
                days_left: daysLeft,
                is_near_target: isNearTarget,
                is_target_reached: isTargetReached
            };
        });

        res.json({ success: true, campaigns });
    });
};

// =====================================================
// GET SINGLE CAMPAIGN WITH COMMITMENTS
// =====================================================
const getCampaignById = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT
            gbc.*,
            c.crop_name,
            c.specific_name,
            c.image AS crop_image,
            farmer.first_name AS farmer_first_name,
            farmer.last_name AS farmer_last_name,
            farmer.phone AS farmer_phone,
            farmer.address AS farmer_location,
            ROUND(((gbc.original_price - gbc.group_price) / gbc.original_price) * 100) AS discount_percentage,
            ROUND((gbc.current_committed_quantity / gbc.min_target_quantity) * 100, 1) AS progress_percentage,
            GREATEST(0, gbc.min_target_quantity - gbc.current_committed_quantity) AS remaining_to_target,
            GREATEST(0, gbc.max_available_quantity - gbc.current_committed_quantity) AS remaining_stock
        FROM group_buying_campaigns gbc
        JOIN crops c ON gbc.crop_id = c.id
        JOIN users farmer ON gbc.farmer_id = farmer.id
        WHERE gbc.id = ?
    `;

    db.query(sql, [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Campaign not found." });
        }

        const campaign = rows[0];

        // Fetch commitments
        const commSql = `
            SELECT
                gbcom.*,
                u.first_name,
                u.last_name
            FROM group_buying_commitments gbcom
            JOIN users u ON gbcom.buyer_id = u.id
            WHERE gbcom.campaign_id = ? AND gbcom.status = 'committed'
            ORDER BY gbcom.created_at ASC
        `;

        db.query(commSql, [id], (commErr, commitments) => {
            if (commErr) {
                return res.status(500).json({ success: false, message: "Failed to fetch commitments." });
            }

            res.json({
                success: true,
                campaign,
                commitments,
                participant_count: commitments.length
            });
        });
    });
};

// =====================================================
// CREATE CAMPAIGN (FARMER)
// =====================================================
const createCampaign = (req, res) => {
    const {
        farmer_id,
        crop_id,
        title,
        description,
        original_price,
        group_price,
        min_target_quantity,
        max_available_quantity,
        min_per_buyer = 5,
        max_per_buyer = 200,
        start_date,
        end_date
    } = req.body;

    if (!farmer_id || !crop_id || !title || !original_price || !group_price || !min_target_quantity) {
        return res.status(400).json({
            success: false,
            message: "Farmer ID, crop ID, title, original price, group price, and target quantity are required."
        });
    }

    if (parseFloat(group_price) >= parseFloat(original_price)) {
        return res.status(400).json({
            success: false,
            message: "Discounted group price must be lower than original selling price."
        });
    }

    const maxStock = max_available_quantity || min_target_quantity;
    const startDate = start_date || new Date().toISOString().split("T")[0];
    const endDate = end_date || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0];

    const sql = `
        INSERT INTO group_buying_campaigns
        (farmer_id, crop_id, title, description, original_price, group_price, min_target_quantity, max_available_quantity, current_committed_quantity, min_per_buyer, max_per_buyer, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?, 'active')
    `;

    db.query(
        sql,
        [
            farmer_id,
            crop_id,
            title,
            description || null,
            original_price,
            group_price,
            min_target_quantity,
            maxStock,
            min_per_buyer,
            max_per_buyer,
            startDate,
            endDate
        ],
        (err, result) => {
            if (err) {
                console.error("Create campaign error:", err);
                return res.status(500).json({ success: false, message: "Failed to create group campaign." });
            }

            res.status(201).json({
                success: true,
                message: "Group buying campaign created successfully!",
                campaign_id: result.insertId
            });
        }
    );
};

// =====================================================
// JOIN CAMPAIGN & POOL DEMAND (BUYER) - TRANSACTION SAFE
// =====================================================
const joinCampaign = (req, res) => {
    const { id } = req.params;
    const { buyer_id, quantity, notes } = req.body;

    if (!buyer_id || !quantity || parseFloat(quantity) <= 0) {
        return res.status(400).json({
            success: false,
            message: "Buyer ID and valid commitment quantity are required."
        });
    }

    const commitQty = parseFloat(quantity);

    // Fetch campaign details with fresh query
    db.query("SELECT * FROM group_buying_campaigns WHERE id = ?", [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Campaign not found." });
        }

        const campaign = rows[0];

        if (campaign.status !== "active" && campaign.status !== "target_reached") {
            return res.status(400).json({
                success: false,
                message: `This campaign is ${campaign.status} and cannot accept new commitments.`
            });
        }

        // Validate limits
        if (commitQty < parseFloat(campaign.min_per_buyer)) {
            return res.status(400).json({
                success: false,
                message: `Minimum order for this group pool is ${campaign.min_per_buyer} kg.`
            });
        }

        if (commitQty > parseFloat(campaign.max_per_buyer)) {
            return res.status(400).json({
                success: false,
                message: `Maximum order per buyer is ${campaign.max_per_buyer} kg.`
            });
        }

        const remainingStock = parseFloat(campaign.max_available_quantity) - parseFloat(campaign.current_committed_quantity);
        if (commitQty > remainingStock) {
            return res.status(400).json({
                success: false,
                message: `Only ${remainingStock} kg remaining available in this campaign.`
            });
        }

        const unitPrice = parseFloat(campaign.group_price);
        const totalAmount = unitPrice * commitQty;
        const newCommittedQty = parseFloat(campaign.current_committed_quantity) + commitQty;
        const targetReached = newCommittedQty >= parseFloat(campaign.min_target_quantity);
        const newStatus = targetReached ? "target_reached" : "active";

        // Insert commitment
        const commitSql = `
            INSERT INTO group_buying_commitments
            (campaign_id, buyer_id, quantity, unit_price, total_amount, status, notes)
            VALUES (?, ?, ?, ?, ?, 'committed', ?)
        `;

        db.query(commitSql, [id, buyer_id, commitQty, unitPrice, totalAmount, notes || null], (cErr, cResult) => {
            if (cErr) {
                console.error("Commitment error:", cErr);
                return res.status(500).json({ success: false, message: "Failed to record commitment." });
            }

            // Update campaign totals & status
            const updateCampaignSql = `
                UPDATE group_buying_campaigns
                SET current_committed_quantity = ?, status = ?, updated_at = NOW()
                WHERE id = ?
            `;

            db.query(updateCampaignSql, [newCommittedQty, newStatus, id], (uErr) => {
                if (uErr) {
                    console.error("Update campaign total error:", uErr);
                }

                // Milestone Notification triggers
                const prevPct = (parseFloat(campaign.current_committed_quantity) / parseFloat(campaign.min_target_quantity)) * 100;
                const newPct = (newCommittedQty / parseFloat(campaign.min_target_quantity)) * 100;

                let milestoneTitle = null;
                let milestoneMsg = null;

                if (targetReached && campaign.status !== "target_reached") {
                    milestoneTitle = "Group Target Reached! (100%)";
                    milestoneMsg = `Campaign "${campaign.title}" reached its full target of ${campaign.min_target_quantity} kg! Wholesale rate ₹${unitPrice}/kg unlocked!`;
                } else if (newPct >= 75 && prevPct < 75) {
                    milestoneTitle = "Campaign Milestone: 75% Reached";
                    milestoneMsg = `Campaign "${campaign.title}" is 75% filled! Only ${campaign.min_target_quantity - newCommittedQty} kg to wholesale unlock.`;
                } else if (newPct >= 50 && prevPct < 50) {
                    milestoneTitle = "Campaign Milestone: 50% Reached";
                    milestoneMsg = `Campaign "${campaign.title}" has reached half of its target volume!`;
                }

                if (milestoneTitle) {
                    db.query(
                        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'order')",
                        [campaign.farmer_id, milestoneTitle, milestoneMsg]
                    );
                    db.query(
                        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'order')",
                        [buyer_id, milestoneTitle, milestoneMsg]
                    );
                }

                res.status(201).json({
                    success: true,
                    message: `Successfully joined group pool with ${commitQty} kg!`,
                    commitment_id: cResult.insertId,
                    total_committed: newCommittedQty,
                    target_reached: targetReached,
                    savings: (parseFloat(campaign.original_price) - unitPrice) * commitQty
                });
            });
        });
    });
};

// =====================================================
// GET MY GROUP PURCHASES (BUYER)
// =====================================================
const getBuyerCommitments = (req, res) => {
    const { buyer_id } = req.params;

    const sql = `
        SELECT
            gbcom.*,
            gbc.title AS campaign_title,
            gbc.original_price,
            gbc.group_price,
            gbc.min_target_quantity,
            gbc.current_committed_quantity,
            gbc.end_date,
            gbc.status AS campaign_status,
            c.crop_name,
            c.image AS crop_image,
            farmer.first_name AS farmer_first_name,
            farmer.last_name AS farmer_last_name,
            ROUND((gbc.current_committed_quantity / gbc.min_target_quantity) * 100, 1) AS progress_percentage
        FROM group_buying_commitments gbcom
        JOIN group_buying_campaigns gbc ON gbcom.campaign_id = gbc.id
        JOIN crops c ON gbc.crop_id = c.id
        JOIN users farmer ON gbc.farmer_id = farmer.id
        WHERE gbcom.buyer_id = ?
        ORDER BY gbcom.created_at DESC
    `;

    db.query(sql, [buyer_id], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Failed to fetch commitments." });
        }
        res.json({ success: true, commitments: rows });
    });
};

// =====================================================
// SMART RECOMMENDATIONS FOR GROUP BUYING
// =====================================================
const getSmartRecommendations = (req, res) => {
    const sql = `
        SELECT
            gbc.*,
            c.crop_name,
            c.image AS crop_image,
            farmer.first_name AS farmer_first_name,
            farmer.last_name AS farmer_last_name,
            ROUND(((gbc.original_price - gbc.group_price) / gbc.original_price) * 100) AS discount_percentage,
            ROUND((gbc.current_committed_quantity / gbc.min_target_quantity) * 100, 1) AS progress_percentage,
            GREATEST(0, gbc.min_target_quantity - gbc.current_committed_quantity) AS remaining_to_target,
            (SELECT COUNT(DISTINCT buyer_id) FROM group_buying_commitments WHERE campaign_id = gbc.id) AS participant_count
        FROM group_buying_campaigns gbc
        JOIN crops c ON gbc.crop_id = c.id
        JOIN users farmer ON gbc.farmer_id = farmer.id
        WHERE gbc.status IN ('active', 'target_reached')
        ORDER BY
            -- Prioritize high progress (>70%) but not expired
            progress_percentage DESC,
            discount_percentage DESC
        LIMIT 6
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Failed to fetch recommendations." });
        }

        const recommendations = rows.map((r) => {
            let reason = "High savings group discount";
            if (r.progress_percentage >= 70 && r.progress_percentage < 100) {
                reason = `Almost unlocked! Only ${r.remaining_to_target} kg remaining to hit target`;
            } else if (r.progress_percentage >= 100) {
                reason = "Target reached! Wholesale discount guaranteed";
            } else if (r.discount_percentage >= 20) {
                reason = `Huge savings: ${r.discount_percentage}% off retail price`;
            }

            return {
                ...r,
                recommendation_reason: reason
            };
        });

        res.json({ success: true, recommendations });
    });
};

module.exports = {
    getCampaigns,
    getCampaignById,
    createCampaign,
    joinCampaign,
    getBuyerCommitments,
    getSmartRecommendations
};
