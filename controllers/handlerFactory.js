const { ObjectId } = require('mongoose').Types;
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = Model =>
    catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const doc = await Model.findByIdAndDelete(id);

        if (!doc)
            return next(
                new AppError('No document found with the given id. 😟'),
                404
            );

        res.status(204).json({
            status: 'success',
            data: null
        });
    });

exports.updateOne = Model =>
    catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const doc = await Model.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });

        if (!doc)
            return next(
                new AppError('No document found with the given id. 😟'),
                404
            );

        res.status(200).json({
            body: {
                data: doc
            }
        });
    });

exports.createOne = Model =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.create(req.body);
        res.status(201).json({
            status: 'success',
            data: {
                data: doc
            }
        });
    });

exports.getOne = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {
        let query = Model.findById(req.params.id);
        if (populateOptions) query = query.populate(populateOptions);
        const doc = await query;

        if (!doc)
            return next(
                new AppError('No document found with the given id. 😟'),
                404
            );

        res.status(200).json({
            status: 'success',
            body: {
                data: doc
            }
        });
    });

exports.getAll = Model =>
    catchAsync(async (req, res, next) => {
        // Execute query
        // The query chaining is only possible because we always
        // return this in the class methods
        const filter =
            req.params.tourId === undefined
                ? {}
                : { tour: ObjectId(req.params.tourId) };
        const features = new APIFeatures(Model.find(filter), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();
        const documents = await features.query;
        // const documents = await features.query.explain();

        // Send response
        res.status(200).json({
            status: 'success',
            results: documents.length,
            body: {
                data: documents
            }
        });
    });
