const mongoose = require('mongoose');

const AuthSchema = mongoose.Schema({
    password: { type: String, required: true, min: 8, select: false },
    tokens: { type: [String], select: false },

    verify_email_hash: { type: String, select: false },
    verify_email_expire: { type: String, select: false },
    reset_pass_hash: { type: String, select: false },
    reset_pass_expire: { type: Date, select: false },
    otp_key: { type: String, select: false },
    otp_expire: { type: Number, select: false },

    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
}, { _id: false });

module.exports = AuthSchema;