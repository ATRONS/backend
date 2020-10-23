const mongoose = require('mongoose');

const AuthSchema = mongoose.Schema({
    password: { type: String, required: true, min: 8 },
    tokens: { type: [String] },

    verify_email_hash: String,
    verify_email_expire: Number,
    reset_pass_hash: String,
    reset_pass_expire: Number,
    otp_key: String,
    otp_expire: Number,

    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
}, { _id: false });

module.exports = AuthSchema;