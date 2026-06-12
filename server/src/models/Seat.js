const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
    {
        seatMap: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SeatMap",
            required: [true, "Seat map is required."],
        },
        venue: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Venue",
            required: [true, "Venue is required."],
        },
        section: {
            type: String,
            required: [true, "Section is required."],
            trim: true,
        },
        row: {
            type: String,
            default: "",
            trim: true,
        },
        number: {
            type: Number,
        },
        label: {
            type: String,
            required: [true, "Seat label is required."],
            trim: true,
        },
        seatType: {
            type: String,
            enum: [
                "standard",
                "box",
                "central_box",
                "auxiliary",
                "wheelchair",
                "unavailable",
                "other",
            ],
            default: "standard",
        },
        priceCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PriceCategory",
        },
        x: {
            type: Number,
            required: true,
        },
        y: {
            type: Number,
            required: true,
        },
        width: {
            type: Number,
            default: 24,
        },
        height: {
            type: Number,
            default: 24,
        },
        // izbaciti
        rotation: {
            type: Number,
            default: 0,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isSellable: {
            type: Boolean,
            default: true,
        },
        visualGroup: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

seatSchema.index({ seatMap: 1, label: 1 }, { unique: true });
seatSchema.index({ seatMap: 1, section: 1 });
seatSchema.index({ venue: 1 });

module.exports = mongoose.model("Seat", seatSchema, "seats");