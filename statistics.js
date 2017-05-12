var util = require('util');
var EventEmitter = require('events').EventEmitter;
var statistics = new EventEmitter();
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('odds_database.db');

statistics.update = function(user_id, statistic) {
    return new Promise((resolve, reject) => {
        db.serialize(function() {
            db.run("UPDATE statistics SET declined_challenges = " + statistic + " + 1 WHERE user_id = $id", {$id: user_id}, function() {
                if(this.changes) {
                    resolve(true);
                    console.log('updated declined_challenges');
                }
                reject()
                console.log('declined');
            })    
        });
    });
}

module.exports = function() {
	return statistics;
};



