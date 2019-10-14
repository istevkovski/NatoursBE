const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
    console.log(err.name, err.message);
    console.log('Shutting down... ☹️');
    // During an uncaughtException, crushing the application is strict!
    // Because the application is a so called unclean state.
    process.exit(1);
});

// Configuring config.env before the app is ran.
dotenv.config({ path: './config.env' });
// App has to be required after the dotenv is loaded
// Otherwise we don't get access to them.
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DB_PASSWORD);
mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    })
    .then(() => console.log(`DB Connection successful.`));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}`);
});

process.on('unhandledRejection', err => {
    console.log(err.name, err.message);
    console.log('Shutting down... ☹️');
    // During an unhandledRejection, crushing the application is optional
    server.close(() => {
        process.exit(1);
    });
});
