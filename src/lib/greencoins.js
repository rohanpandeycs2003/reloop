/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           RELOOP — GREENCOINS REWARD ENGINE                  ║
 * ║                                                              ║
 * ║  All reward logic lives here. Frontend uses it for instant   ║
 * ║  estimates. Backend validates & commits the actual credits.  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const REWARD_CONFIG = {
  // Base
  COINS_PER_CAN: 15,

  // Bonuses
  FIRST_UPLOAD_BONUS:    100,
  BULK_UPLOAD_BONUS:      40,   // threshold: 10+ cans in one upload
  BULK_UPLOAD_THRESHOLD:  10,
  STREAK_7DAY_BONUS:      50,
  STREAK_REQUIRED_DAYS:    7,
  REFERRAL_REFERRER:     250,   // coins to the person who referred
  REFERRAL_NEW_USER:     100,   // welcome coins to the new user
  MONTHLY_CHALLENGE:     500,   // 100+ cans in one calendar month
  MONTHLY_CHALLENGE_MIN: 100,
}

// ─────────────────────────────────────────────────────────────────────────────
//  CO₂ IMPACT
// ─────────────────────────────────────────────────────────────────────────────

export const CO2_PER_CAN = 0.1 // kg of CO₂ saved per recycled aluminium can

/**
 * Calculate CO₂ saved from approved recycled cans.
 * Formula: totalApprovedCans × 0.1 kg
 *
 * @param {number} totalApprovedCans - Total cans approved (not pending/rejected)
 * @returns {string} Formatted string e.g. "14.2kg"
 *
 * @example
 *   calculateCO2Saved(10)   // "1.0kg"
 *   calculateCO2Saved(50)   // "5.0kg"
 *   calculateCO2Saved(142)  // "14.2kg"
 */
export function calculateCO2Saved(totalApprovedCans) {
  if (!totalApprovedCans || totalApprovedCans < 0) return '0.0kg'
  const kg = (totalApprovedCans * CO2_PER_CAN).toFixed(1)
  return `${kg}kg`
}

// ─────────────────────────────────────────────────────────────────────────────
//  BASE REWARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate base GreenCoins for a given number of cans.
 *
 * @param {number} canCount - Number of aluminium cans
 * @returns {number} Base GreenCoins earned
 *
 * @example
 *   calculateBaseReward(5)   // 75
 *   calculateBaseReward(10)  // 150
 *   calculateBaseReward(20)  // 300
 */
export function calculateBaseReward(canCount) {
  if (!Number.isInteger(canCount) || canCount < 1) {
    throw new Error(`canCount must be a positive integer. Got: ${canCount}`)
  }
  return canCount * REWARD_CONFIG.COINS_PER_CAN
}

// ─────────────────────────────────────────────────────────────────────────────
//  BONUS EVALUATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate all applicable bonuses for an upload.
 *
 * @param {number}  canCount          - Cans in this upload
 * @param {object}  userState         - Current state of the user
 * @param {boolean} userState.isFirstUpload      - True if this is user's very first upload
 * @param {boolean} userState.streakCompleted    - True if this upload completes a 7-day streak
 * @param {boolean} userState.monthlyGoalHit     - True if this upload pushes monthly total to 100+
 *
 * @returns {{ bonuses: BonusEntry[], totalBonus: number }}
 *
 * @typedef {{ type: string, coins: number, reason: string }} BonusEntry
 */
export function applyBonuses(canCount, userState = {}) {
  const {
    isFirstUpload    = false,
    streakCompleted  = false,
    monthlyGoalHit   = false,
  } = userState

  const bonuses = []

  // 1. First Upload Bonus — once per user lifetime
  if (isFirstUpload) {
    bonuses.push({
      type:   'FIRST_UPLOAD',
      coins:  REWARD_CONFIG.FIRST_UPLOAD_BONUS,
      reason: '🎉 First upload bonus!',
    })
  }

  // 2. Bulk Upload Bonus — once per upload when 10+ cans
  if (canCount >= REWARD_CONFIG.BULK_UPLOAD_THRESHOLD) {
    bonuses.push({
      type:   'BULK_UPLOAD',
      coins:  REWARD_CONFIG.BULK_UPLOAD_BONUS,
      reason: `📦 Bulk bonus — ${canCount} cans in one go!`,
    })
  }

  // 3. 7-Day Streak Bonus
  if (streakCompleted) {
    bonuses.push({
      type:   'STREAK_7DAY',
      coins:  REWARD_CONFIG.STREAK_7DAY_BONUS,
      reason: '🔥 7-day streak — on fire!',
    })
  }

  // 4. Monthly Challenge Bonus
  if (monthlyGoalHit) {
    bonuses.push({
      type:   'MONTHLY_CHALLENGE',
      coins:  REWARD_CONFIG.MONTHLY_CHALLENGE,
      reason: '🏆 100 cans this month — legend!',
    })
  }

  const totalBonus = bonuses.reduce((sum, b) => sum + b.coins, 0)
  return { bonuses, totalBonus }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FINAL CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full GreenCoins calculation for a single upload.
 * Returns a detailed breakdown — use this for the success screen.
 *
 * @param {number} canCount    - Number of cans in this upload
 * @param {object} userState   - User state (see applyBonuses)
 * @returns {RewardResult}
 *
 * @typedef {{
 *   canCount:    number,
 *   base:        number,
 *   bonuses:     BonusEntry[],
 *   totalBonus:  number,
 *   total:       number,
 *   breakdown:   string
 * }} RewardResult
 *
 * @example
 *   // Example 1 — simple upload
 *   calculateFinalGreenCoins(5, {})
 *   // { base: 75, bonuses: [], totalBonus: 0, total: 75 }
 *
 *   // Example 2 — first upload, bulk
 *   calculateFinalGreenCoins(12, { isFirstUpload: true })
 *   // { base: 180, bonuses: [FIRST_UPLOAD +100, BULK +40], totalBonus: 140, total: 320 }
 *
 *   // Example 3 — bulk + streak
 *   calculateFinalGreenCoins(10, { streakCompleted: true })
 *   // { base: 150, bonuses: [BULK +40, STREAK +50], totalBonus: 90, total: 240 }
 */
export function calculateFinalGreenCoins(canCount, userState = {}) {
  const base                  = calculateBaseReward(canCount)
  const { bonuses, totalBonus } = applyBonuses(canCount, userState)
  const total                 = base + totalBonus

  // Human-readable breakdown string for UI display
  const lines = [`${canCount} × 15 = ${base}`]
  bonuses.forEach(b => lines.push(`${b.reason} +${b.coins}`))
  lines.push(`Total: ${total} GreenCoins`)
  const breakdown = lines.join('\n')

  return { canCount, base, bonuses, totalBonus, total, breakdown }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STREAK MANAGER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update and evaluate user's upload streak.
 * Call this when an upload is APPROVED (not at submission time).
 *
 * @param {object} streakState
 * @param {string|null} streakState.lastUploadDate - ISO date string of last approved upload
 * @param {number}      streakState.currentStreak  - Current consecutive day count
 *
 * @returns {{ newStreak: number, streakCompleted: boolean, streakBroken: boolean }}
 */
export function updateStreak({ lastUploadDate, currentStreak }) {
  const today     = toDateOnly(new Date())
  const yesterday = toDateOnly(daysAgo(1))

  // No previous upload — start fresh
  if (!lastUploadDate) {
    return { newStreak: 1, streakCompleted: false, streakBroken: false }
  }

  const last = lastUploadDate.substring(0, 10) // normalise to YYYY-MM-DD

  if (last === today) {
    // Already uploaded today — streak unchanged (idempotent)
    return {
      newStreak:       currentStreak,
      streakCompleted: currentStreak >= REWARD_CONFIG.STREAK_REQUIRED_DAYS,
      streakBroken:    false,
    }
  }

  if (last === yesterday) {
    // Consecutive day — increment streak
    const newStreak = currentStreak + 1
    return {
      newStreak,
      streakCompleted: newStreak % REWARD_CONFIG.STREAK_REQUIRED_DAYS === 0,
      streakBroken: false,
    }
  }

  // Missed a day — reset streak to 1
  return { newStreak: 1, streakCompleted: false, streakBroken: true }
}

// ─────────────────────────────────────────────────────────────────────────────
//  REFERRAL VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate and resolve a referral bonus.
 * Only triggers after new user's FIRST APPROVED upload (anti-fraud).
 *
 * @param {object} referralState
 * @param {string}  referralState.referrerId        - UID of the referrer
 * @param {string}  referralState.newUserId         - UID of the new user
 * @param {string}  referralState.newUserPhone      - Phone number of new user
 * @param {boolean} referralState.firstUploadApproved - Has the new user's first upload been approved?
 * @param {boolean} referralState.bonusAlreadyPaid  - Was this referral bonus already paid?
 * @param {boolean} referralState.sameDevice        - Did both accounts come from the same device?
 * @param {boolean} referralState.samePhone         - Same phone number? (impossible but guard it)
 *
 * @returns {{ valid: boolean, reason: string, referrerBonus: number, newUserBonus: number }}
 */
export function validateReferralBonus({
  referrerId,
  newUserId,
  newUserPhone,
  firstUploadApproved = false,
  bonusAlreadyPaid    = false,
  sameDevice          = false,
  samePhone           = false,
}) {
  // Guard: can't refer yourself
  if (referrerId === newUserId) {
    return { valid: false, reason: 'Self-referral detected', referrerBonus: 0, newUserBonus: 0 }
  }

  // Guard: same phone number
  if (samePhone) {
    return { valid: false, reason: 'Same phone number', referrerBonus: 0, newUserBonus: 0 }
  }

  // Guard: device fingerprint match (flag for manual review, don't auto-credit)
  if (sameDevice) {
    return { valid: false, reason: 'Same device fingerprint — flagged for review', referrerBonus: 0, newUserBonus: 0 }
  }

  // Guard: bonus not yet earned (new user hasn't completed first upload)
  if (!firstUploadApproved) {
    return { valid: false, reason: 'Awaiting new user first approved upload', referrerBonus: 0, newUserBonus: 0 }
  }

  // Guard: already paid out
  if (bonusAlreadyPaid) {
    return { valid: false, reason: 'Referral bonus already credited', referrerBonus: 0, newUserBonus: 0 }
  }

  return {
    valid:         true,
    reason:        'Referral validated ✓',
    referrerBonus: REWARD_CONFIG.REFERRAL_REFERRER,  // 250 coins
    newUserBonus:  REWARD_CONFIG.REFERRAL_NEW_USER,  // 100 coins
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MONTHLY CHALLENGE TRACKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether this upload pushes the user over the monthly challenge threshold.
 * Returns true only on the upload that crosses the line (not on every upload after).
 *
 * @param {number} previousMonthlyTotal - Cans recycled so far this month (before this upload)
 * @param {number} uploadCanCount       - Cans in this upload
 * @returns {boolean}
 */
export function checkMonthlyChallengeHit(previousMonthlyTotal, uploadCanCount) {
  const before = previousMonthlyTotal
  const after  = previousMonthlyTotal + uploadCanCount
  return before < REWARD_CONFIG.MONTHLY_CHALLENGE_MIN &&
         after  >= REWARD_CONFIG.MONTHLY_CHALLENGE_MIN
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANTI-FRAUD CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a set of basic fraud signals on an incoming upload.
 * Returns a risk score (0 = clean, >0 = needs review) and flags.
 *
 * @param {object} upload
 * @param {number}   upload.canCount           - Claimed number of cans
 * @param {string}   upload.userId
 * @param {string}   upload.imageHash          - Perceptual hash of the uploaded photo
 * @param {number}   upload.uploadsInLastHour  - How many uploads this user made in the last 60 min
 * @param {number}   upload.uploadsToday       - Total uploads by this user today
 * @param {string[]} upload.recentImageHashes  - Image hashes of this user's recent uploads
 *
 * @returns {{ riskScore: number, flags: string[], autoReject: boolean }}
 */
export function runFraudChecks({
  canCount,
  imageHash,
  uploadsInLastHour = 0,
  uploadsToday      = 0,
  recentImageHashes = [],
}) {
  const flags = []
  let   riskScore = 0

  // Flag: absurdly large single upload
  if (canCount > 500) {
    flags.push('UNUSUALLY_HIGH_QUANTITY')
    riskScore += 30
  } else if (canCount > 100) {
    flags.push('HIGH_QUANTITY')
    riskScore += 10
  }

  // Flag: duplicate image
  if (imageHash && recentImageHashes.includes(imageHash)) {
    flags.push('DUPLICATE_IMAGE')
    riskScore += 60
  }

  // Flag: upload spam within the hour
  if (uploadsInLastHour >= 3) {
    flags.push('RAPID_UPLOAD_SPAM')
    riskScore += 40
  }

  // Flag: too many uploads in one day
  if (uploadsToday >= 5) {
    flags.push('HIGH_DAILY_UPLOAD_FREQUENCY')
    riskScore += 20
  }

  // Auto-reject only on very high risk (duplicate image + spam)
  const autoReject = riskScore >= 80

  return { riskScore, flags, autoReject }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FULL UPLOAD PROCESSOR  (single entry point for backend)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master function — process an approved upload end-to-end.
 * Backend calls this after admin approval.
 *
 * @param {object} params
 * @param {number} params.canCount
 * @param {object} params.streakState      - { lastUploadDate, currentStreak }
 * @param {number} params.previousMonthly  - Cans recycled this month before this upload
 * @param {boolean} params.isFirstUpload
 *
 * @returns {{
 *   reward:           RewardResult,
 *   newStreak:        number,
 *   streakCompleted:  boolean,
 *   streakBroken:     boolean,
 *   monthlyGoalHit:   boolean,
 *   newMonthlyTotal:  number,
 * }}
 */
export function processApprovedUpload({
  canCount,
  streakState      = { lastUploadDate: null, currentStreak: 0 },
  previousMonthly  = 0,
  isFirstUpload    = false,
}) {
  // 1. Streak
  const { newStreak, streakCompleted, streakBroken } = updateStreak(streakState)

  // 2. Monthly challenge
  const monthlyGoalHit  = checkMonthlyChallengeHit(previousMonthly, canCount)
  const newMonthlyTotal = previousMonthly + canCount

  // 3. Full reward with all applicable bonuses
  const reward = calculateFinalGreenCoins(canCount, {
    isFirstUpload,
    streakCompleted,
    monthlyGoalHit,
  })

  return {
    reward,
    newStreak,
    streakCompleted,
    streakBroken,
    monthlyGoalHit,
    newMonthlyTotal,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FRONTEND ESTIMATE  (no state needed — for showing on upload step 1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight estimate for the upload UI.
 * Shows base + possible bulk bonus before submission.
 * Does NOT include streak / first-upload / monthly (unknown at this point).
 *
 * @param {number} canCount
 * @returns {{ base: number, bulkBonus: number, estimated: number, note: string }}
 */
export function estimateReward(canCount) {
  if (!canCount || canCount < 1) return { base: 0, bulkBonus: 0, estimated: 0, note: '' }

  const base      = calculateBaseReward(canCount)
  const bulkBonus = canCount >= REWARD_CONFIG.BULK_UPLOAD_THRESHOLD
    ? REWARD_CONFIG.BULK_UPLOAD_BONUS
    : 0

  const estimated = base + bulkBonus
  const note      = canCount >= REWARD_CONFIG.BULK_UPLOAD_THRESHOLD
    ? `Includes +${REWARD_CONFIG.BULK_UPLOAD_BONUS} bulk bonus 🎉`
    : `Upload ${REWARD_CONFIG.BULK_UPLOAD_THRESHOLD - canCount} more for +${REWARD_CONFIG.BULK_UPLOAD_BONUS} bulk bonus`

  return { base, bulkBonus, estimated, note }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────────────────────

function toDateOnly(date) {
  return date.toISOString().substring(0, 10)
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
