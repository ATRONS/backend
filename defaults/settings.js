module.exports = {
    ATRONS_SERVICE_FEE_PERCENT: 0.1,
    MINIMUM_WITHDRAWABLE_AMOUNT: 50,
    HELLOCASH_SERVICE_FEE_PERCENT: 0.03,
    TAX_FEE_PERCENT: 0.15,

    INVOICE_TYPES: {
        WITHDRAWAL: 'WITHDRAWAL',
        PURCHASE: 'PURCHASE',
        SERVICE_FEE: 'SERVICE_FEE',
        TAX_FEE: 'TAX_FEE',
    },

    REQUEST_STATUS: {
        PENDING: "PENDING",
        DENIED: "DENIED",
        ACCEPTED: "ACCEPTED"
    },

    REQUEST_CATEGORIES: {
        WITHDRAWAL: "WITHDRAWAL",
        MATERIAL_REMOVAL: "MATERIAL_REMOVAL",
        DELETE_ACCOUNT: "DELETE_ACCOUNT"
    }
}