/**
 * Counter Model
 *
 * Implements atomic sequence counter (PRD Section 10.7) for concurrency-safe
 * sequential Player IDs (e.g. PH-00001) using findOneAndUpdate with $inc.
 */

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: Number,
    default: 0,
  },
});

/**
 * Atomically increments and returns the next sequence integer for a named counter.
 * @param {string} sequenceName - Identifier for the counter (e.g. 'playerId')
 * @returns {Promise<number>} - Next sequential integer
 */
counterSchema.statics.getNextSequence = async function (sequenceName) {
  const counter = await this.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
