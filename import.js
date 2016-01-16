const parse = require('csv-parse');
const request = require('request');
const through2 = require('through2');
const MongoClient = require('mongodb').MongoClient;
const debug = require('debug')('import');
const Promise = require('bluebird');

const mongoConnection = MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost/necmergitur-erp');

mongoConnection.then(() => debug('connection established'));

const sourceFiles = [
        'https://raw.githubusercontent.com/IGNF/hackathon-necmergitur/master/collecte/CSV/J.csv'
];

function cleanData(db) {
    const clean = db.collection('erp').remove({});
    clean.then(() => debug('all data cleaned'));
    return clean;
}

function loadData(db) {
    debug('will load %d datasets', sourceFiles.length);
    return new Promise((resolve, reject) => {
        request(sourceFiles[0])
            .pipe(parse({ delimiter: ';', columns: true }))
            .pipe(through2.obj((data, enc, callback) => {
                debug('import %s', data.nom);
                db.collection('erp').insertOne({
                    label: data.nom,
                    addresse: data.adresse,
                    position: {
                        type: 'Point',
                        coordinates: [parseFloat(data.lon), parseFloat(data.lat)]
                    },
                    abstract: 'No description'
                }, callback);
            }))
            .on('error', err => reject(err))
            .on('end', () => {
                debug('dataset loaded');
                resolve();
            })
            .resume();
    });
}

function ensureIndex(db) {
    const indexCreation = db.collection('erp').ensureIndex({ position: '2dsphere' });
    indexCreation.then(() => debug('spatial index created'));
    return indexCreation;
}

mongoConnection
    .then(db => {
        return cleanData(db)
            .then(() => loadData(db))
            .then(() => ensureIndex(db));
    })
    .then(() => {
        debug('has finished!')
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
