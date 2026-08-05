const STATES = ['applied', 'phone_screen', 'technical', 'onsite', 'offer', 'hired', 'rejected']

// Any offer can go to the next stage or rejected stage
// hired and rejected are terminal conditions nothing should transition out of them
const legalTransitions = {
    'applied': ['phone_screen', 'rejected'],
    'phone_screen': ['technical', 'rejected'],
    'technical': ['onsite', 'rejected'],
    'onsite': ['offer', 'rejected'],
    'offer': ['hired', 'rejected'],
    'hired': [],
    'rejected': []
}

/**
 * Determines if a transition between two stages is legally permitted.
 * 
 * @param {string} currentStage - Starting stage
 * @param {string} targetStage - Desired destination stage  
 * @returns {boolean} Whether the transition is allowed
 */
export function canTransition(currentStage, targetStage) {
    // A quick guard to make sure the stage provided is actually a valid state option
    if (!STATES.includes(currentStage) || !STATES.includes(targetStage)) {
        return false
    }
    return legalTransitions[currentStage].includes(targetStage)
}

console.log(canTransition('applied', 'phone_screen')) // should be true
console.log(canTransition('applied', 'rejected')) // should be true
console.log(canTransition('applied', 'offer')) // should be false
console.log(canTransition('technical', 'offer')) // false
console.log(canTransition('onsite', 'offer')) // true
console.log(canTransition('applied', 'onsite')) // false
console.log(canTransition('hired', 'applied'))  // should be false — the crash case from before
console.log(canTransition('applied', 'bogus'))  // should be false — typo/invalid stage