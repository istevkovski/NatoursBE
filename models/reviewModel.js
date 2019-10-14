const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, 'You cannot submit a empty review. 😑'],
            minlength: [
                30,
                'Your review cannot be less than 30 characters long. 😒'
            ]
        },
        rating: {
            type: Number,
            default: 0,
            min: [1, 'The rating cannot be less than 1.0 🙄'],
            max: [5, 'The rating cannot exceed 5.0 🤨']
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review owner must be specified. 👮‍']
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belong to a tour. 😒']
        }
    },
    {
        // Show fields that are not stored in a database in outputs
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
    // This points to the current query
    this.populate({ path: 'user', select: 'name email photo' });
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({ path: 'user', select: 'name email photo -_id' });
    next();
});

reviewSchema.statics.calcAverageRatings = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);

    if (stats.length > 0)
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    else
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 3
        });
};

reviewSchema.post('save', function() {
    // "this" points to current review
    // The "this.constructor" stands for the tour instance
    // Because we cannot use Review.calcAverageRatings
    this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function(next) {
    // this.findOne() will execute the query
    // this.r is a way to pass data from pre to post method
    this.r = await this.findOne();
    next();
});

reviewSchema.post(/^findOneAnd/, async function() {
    // Accessing the passed data from pre
    // this.findOne() does not work in post
    this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
