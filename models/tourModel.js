const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A tour name must be specified'],
            unique: true,
            trim: true,
            maxlength: [40, 'Tour name cannot have more than 40 characters'],
            minlength: [10, 'Tour name cannot have less than 10 characters']
            // validate: [
            //     validator.isAlpha,
            //     'Tour name must only contain characters.'
            // ]
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, 'A tour duration must be specified']
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'A group size must be specified']
        },
        difficulty: {
            type: String,
            required: [true, 'A tour difficulty must be specified'],
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficulty can either be: easy, medium or difficult'
            }
        },
        ratingsAverage: {
            type: Number,
            default: 3,
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating cannot be more than 5.0'],
            set: val => val.toFixed(1)
        },
        ratingsQuantity: {
            type: Number,
            default: 0
        },
        price: {
            type: Number,
            required: [true, 'A tour price must be specified']
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function(val) {
                    return val < this.price;
                },
                message:
                    'Discount price ({VALUE}) should be lower than the regular price'
            }
        },
        summary: {
            type: String,
            // Trim removes the whitespace on the beginning and end of the string.
            trim: true,
            required: [true, 'A tour summary must be specified']
        },
        description: {
            type: String,
            trim: true,
            required: [true, 'A tour description must be specified']
        },
        imageCover: {
            type: String,
            required: [true, 'A tour cover image must be specified']
        },
        // [String] means that I want an array of strings.
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false
        },
        startLocation: {
            // GeoJSON
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String
        },
        locations: [
            {
                type: {
                    type: String,
                    default: 'Point',
                    enum: ['Point']
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number
            }
        ],
        guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function() {
    return this.duration / 7;
});

// Virtual population
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

// Document middleware: Runs before .save() and .create()
// Doesn't run before .insertMany()
tourSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// tourSchema.pre('save', async function(next) {
//     // guidesPromises is an array full of promises
//     const guidesPromises = this.guides.map(async id => await User.findById(id));
//     // We need to await those promises and store them
//     this.guides = await Promise.all(guidesPromises);
//     next();
// });

// Query middleware
// Using regex to catch multiple model methods
tourSchema.pre(/^find/, function(next) {
    this.find({ secretTour: { $ne: true } });
    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function(next) {
    // This points to the current query
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });
    next();
});

tourSchema.post(/^find/, function(docs, next) {
    // console.log(docs);
    console.log(`Query took: ${Date.now() - this.start}ms`);
    next();
});

// Aggregation middleware

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
