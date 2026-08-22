/**
 * RELOOP — GreenCoins Engine Tests
 * Run with: node src/lib/greencoins.test.js
 */

import {
  calculateBaseReward,
  calculateFinalGreenCoins,
  updateStreak,
  validateReferralBonus,
  checkMonthlyChallengeHit,
  runFraudChecks,
  processApprovedUpload,
  estimateReward,
  REWARD_CONFIG,
} from './greencoins.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅  ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌  ${name}`)
    console.log(`       → ${e.message}`)
    failed++
  }
}

function assert(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg ?? 'Assertion failed'}: expected ${expected}, got ${actual}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── BASE REWARD ──────────────────────────────────────────────')

test('1 can = 15 GreenCoins',  () => assert(calculateBaseReward(1),  15))
test('5 cans = 75',            () => assert(calculateBaseReward(5),  75))
test('10 cans = 150',          () => assert(calculateBaseReward(10), 150))
test('20 cans = 300',          () => assert(calculateBaseReward(20), 300))
test('throws on 0 cans',       () => {
  try { calculateBaseReward(0); throw new Error('Should have thrown') }
  catch (e) { if (e.message === 'Should have thrown') throw e }
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── SPEC EXAMPLES ────────────────────────────────────────────')

test('Example 1: 5 cans, no bonuses → 75', () => {
  const r = calculateFinalGreenCoins(5, {})
  assert(r.total, 75, 'total')
  assert(r.bonuses.length, 0, 'no bonuses')
})

test('Example 2: first upload 12 cans → 320', () => {
  const r = calculateFinalGreenCoins(12, { isFirstUpload: true })
  assert(r.base, 180, 'base (12×15)')
  assert(r.bonuses.find(b => b.type === 'FIRST_UPLOAD')?.coins,  REWARD_CONFIG.FIRST_UPLOAD_BONUS, 'first upload bonus')
  assert(r.bonuses.find(b => b.type === 'BULK_UPLOAD')?.coins,   REWARD_CONFIG.BULK_UPLOAD_BONUS,  'bulk bonus')
  assert(r.total, 320, 'total')
})

test('Example 3: 10 cans + 7-day streak → 240', () => {
  const r = calculateFinalGreenCoins(10, { streakCompleted: true })
  assert(r.base, 150, 'base')
  assert(r.total, 240, 'total')
})

test('Bulk threshold: 9 cans → no bulk bonus', () => {
  const r = calculateFinalGreenCoins(9, {})
  assert(r.bonuses.find(b => b.type === 'BULK_UPLOAD'), undefined, 'no bulk')
})

test('Bulk threshold: 10 cans → bulk bonus applied', () => {
  const r = calculateFinalGreenCoins(10, {})
  assert(r.bonuses.find(b => b.type === 'BULK_UPLOAD')?.coins, 40, 'bulk bonus')
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── STREAK ───────────────────────────────────────────────────')

const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const yStr = yesterday.toISOString().substring(0, 10)

const twoDaysAgo = new Date()
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
const tdStr = twoDaysAgo.toISOString().substring(0, 10)

test('No previous upload → streak = 1', () => {
  const r = updateStreak({ lastUploadDate: null, currentStreak: 0 })
  assert(r.newStreak, 1)
  assert(r.streakBroken, false)
})

test('Uploaded yesterday → streak increments', () => {
  const r = updateStreak({ lastUploadDate: yStr, currentStreak: 4 })
  assert(r.newStreak, 5)
  assert(r.streakBroken, false)
})

test('Missed a day → streak resets to 1', () => {
  const r = updateStreak({ lastUploadDate: tdStr, currentStreak: 5 })
  assert(r.newStreak, 1)
  assert(r.streakBroken, true)
})

test('7th consecutive day → streakCompleted = true', () => {
  const r = updateStreak({ lastUploadDate: yStr, currentStreak: 6 })
  assert(r.newStreak, 7)
  assert(r.streakCompleted, true)
})

test('14th consecutive day → streakCompleted = true (every 7 days)', () => {
  const r = updateStreak({ lastUploadDate: yStr, currentStreak: 13 })
  assert(r.streakCompleted, true)
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── REFERRAL ─────────────────────────────────────────────────')

const validReferral = {
  referrerId: 'user_A', newUserId: 'user_B', newUserPhone: '+919876543210',
  firstUploadApproved: true, bonusAlreadyPaid: false, sameDevice: false, samePhone: false,
}

test('Valid referral → approved, correct coins', () => {
  const r = validateReferralBonus(validReferral)
  assert(r.valid, true)
  assert(r.referrerBonus, 250)
  assert(r.newUserBonus, 100)
})

test('Self-referral blocked', () => {
  const r = validateReferralBonus({ ...validReferral, newUserId: 'user_A' })
  assert(r.valid, false)
})

test('Same device blocked', () => {
  const r = validateReferralBonus({ ...validReferral, sameDevice: true })
  assert(r.valid, false)
})

test('First upload not yet approved → blocked', () => {
  const r = validateReferralBonus({ ...validReferral, firstUploadApproved: false })
  assert(r.valid, false)
})

test('Already paid → blocked', () => {
  const r = validateReferralBonus({ ...validReferral, bonusAlreadyPaid: true })
  assert(r.valid, false)
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── MONTHLY CHALLENGE ────────────────────────────────────────')

test('Crosses 100 threshold → true',      () => assert(checkMonthlyChallengeHit(90, 15), true))
test('Exactly hits 100 → true',           () => assert(checkMonthlyChallengeHit(99,  1), true))
test('Already over 100 → false (no dup)', () => assert(checkMonthlyChallengeHit(110, 10), false))
test('Well under 100 → false',            () => assert(checkMonthlyChallengeHit(50, 30), false))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── ANTI-FRAUD ───────────────────────────────────────────────')

test('Clean upload → riskScore 0, no flags', () => {
  const r = runFraudChecks({ canCount: 10, imageHash: 'abc123', uploadsInLastHour: 0, uploadsToday: 1, recentImageHashes: [] })
  assert(r.riskScore, 0)
  assert(r.flags.length, 0)
  assert(r.autoReject, false)
})

test('Duplicate image → flagged + high risk', () => {
  const r = runFraudChecks({ canCount: 5, imageHash: 'abc123', uploadsInLastHour: 0, uploadsToday: 1, recentImageHashes: ['abc123'] })
  assert(r.flags.includes('DUPLICATE_IMAGE'), true)
  assert(r.riskScore >= 60, true)
})

test('Spam uploads → flagged', () => {
  const r = runFraudChecks({ canCount: 5, imageHash: 'xyz', uploadsInLastHour: 4, uploadsToday: 4, recentImageHashes: [] })
  assert(r.flags.includes('RAPID_UPLOAD_SPAM'), true)
})

test('Duplicate + spam → autoReject', () => {
  const r = runFraudChecks({ canCount: 5, imageHash: 'abc', uploadsInLastHour: 4, uploadsToday: 4, recentImageHashes: ['abc'] })
  assert(r.autoReject, true)
})

test('500+ cans → UNUSUALLY_HIGH_QUANTITY flagged', () => {
  const r = runFraudChecks({ canCount: 501, imageHash: 'new', uploadsInLastHour: 0, uploadsToday: 1, recentImageHashes: [] })
  assert(r.flags.includes('UNUSUALLY_HIGH_QUANTITY'), true)
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── ESTIMATE (UI) ────────────────────────────────────────────')

test('5 cans estimate = 75, no bulk note', () => {
  const e = estimateReward(5)
  assert(e.estimated, 75)
  assert(e.bulkBonus, 0)
})

test('10 cans estimate = 190, bulk included', () => {
  const e = estimateReward(10)
  assert(e.estimated, 190)
  assert(e.bulkBonus, 40)
})

test('9 cans note says how many more for bulk', () => {
  const e = estimateReward(9)
  assert(e.note.includes('1 more'), true)
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── FULL UPLOAD PROCESSOR ────────────────────────────────────')

test('First upload 12 cans, streak day 1 → 320 coins', () => {
  const result = processApprovedUpload({
    canCount:        12,
    streakState:     { lastUploadDate: null, currentStreak: 0 },
    previousMonthly: 0,
    isFirstUpload:   true,
  })
  assert(result.reward.total, 320)
  assert(result.newStreak, 1)
  assert(result.newMonthlyTotal, 12)
})

test('10 cans on day 7 → streak bonus + bulk', () => {
  const result = processApprovedUpload({
    canCount:        10,
    streakState:     { lastUploadDate: yStr, currentStreak: 6 },
    previousMonthly: 50,
    isFirstUpload:   false,
  })
  assert(result.reward.total, 240)
  assert(result.streakCompleted, true)
})

test('Upload that hits monthly 100 → +500 bonus', () => {
  const result = processApprovedUpload({
    canCount:        20,
    streakState:     { lastUploadDate: yStr, currentStreak: 3 },
    previousMonthly: 85,
    isFirstUpload:   false,
  })
  assert(result.monthlyGoalHit, true)
  // 20×15=300 + bulk40 + monthly500 = 840
  assert(result.reward.total, 840)
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────────────────')
console.log(`  Results: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('  🟢 All tests passed!\n')
} else {
  console.log(`  🔴 ${failed} test(s) failed\n`)
  process.exit(1)
}
