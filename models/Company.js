/**
 * models/Company.js
 * Mongoose schema for enriched company records.
 */
import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    companyName: { type: String, required: true, index: true },
    exhibition: { type: String, default: '', index: true },
    boothNumber: { type: String, default: '' },
    website: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    source: { type: String, default: 'web_scraper' },
    enrichmentStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending',
    },
    errorMessage: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
}, {
    timestamps: true, // adds createdAt, updatedAt
});

// Compound index for fast upsert lookups
companySchema.index({ companyName: 1, exhibition: 1 }, { unique: true });

/**
 * Upsert a single enriched record.
 * If a matching (companyName + exhibition) exists, update it. Otherwise insert.
 */
companySchema.statics.upsertEnriched = async function (data) {
    return this.findOneAndUpdate(
        { companyName: data.companyName, exhibition: data.exhibition || '' },
        {
            ...data,
            lastUpdated: new Date(),
            enrichmentStatus: data.enrichmentStatus || 'completed',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

const Company = mongoose.model('Company', companySchema);
export default Company;
