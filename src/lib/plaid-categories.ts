// Plaid's Personal Finance Category (PFC) primary categories.
// Source: https://plaid.com/docs/api/products/transactions/#categories-get-1

export const PLAID_PFC_PRIMARY = [
  "INCOME",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "LOAN_PAYMENTS",
  "BANK_FEES",
  "ENTERTAINMENT",
  "FOOD_AND_DRINK",
  "GENERAL_MERCHANDISE",
  "HOME_IMPROVEMENT",
  "MEDICAL",
  "PERSONAL_CARE",
  "GENERAL_SERVICES",
  "GOVERNMENT_AND_NON_PROFIT",
  "TRANSPORTATION",
  "TRAVEL",
  "RENT_AND_UTILITIES",
] as const;

export type PlaidPfcPrimary = (typeof PLAID_PFC_PRIMARY)[number];

// Subset that typically makes sense to budget against (excludes income/transfers).
export const BUDGETABLE_PRIMARY: PlaidPfcPrimary[] = [
  "FOOD_AND_DRINK",
  "GENERAL_MERCHANDISE",
  "ENTERTAINMENT",
  "TRANSPORTATION",
  "TRAVEL",
  "RENT_AND_UTILITIES",
  "MEDICAL",
  "PERSONAL_CARE",
  "GENERAL_SERVICES",
  "HOME_IMPROVEMENT",
  "BANK_FEES",
  "LOAN_PAYMENTS",
  "GOVERNMENT_AND_NON_PROFIT",
];
