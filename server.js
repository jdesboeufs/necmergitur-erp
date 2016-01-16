const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const morgan = require('morgan');
const cors = require('cors');

const mongoConnection = MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost/necmergitur-erp');
const app = express();

if (process.env.NODE_ENV === 'production') {
    app.enable('trust proxy');
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

app.use(cors());

// Inject MongoDB db instance
app.use(function injectMongoDBDatabaseInstance(req, res, next) {
    mongoConnection.then(db => {
        req.db = db;
        next();
    }).catch(next);
});

app.get('/erp', function (req, res, next) {
    req.db.collection('erp').find({
        position: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(req.query.lon), parseFloat(req.query.lat)]
                },
                $maxDistance: 1200
            }
        }
    }).toArray().then(function (results) {
        res.send(results);
    }).catch(next);
});
// app.get('/evacmaps', require('./controllers/evacmaps').geo);

app.listen(process.env.PORT || 5000);
