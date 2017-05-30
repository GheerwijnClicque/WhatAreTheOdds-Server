var util = require('util');
var EventEmitter = require('events').EventEmitter;
var statistics = new EventEmitter();
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('odds_database.db');

statistics.update = function(user_id, statistic) {
    return new Promise((resolve, reject) => {
        db.serialize(function() {
            console.log("UPDATE STATISTICS SET " + statistic + " = " + statistic + " + 1 WHERE user_id = $id");
            db.run("UPDATE STATISTICS SET " + statistic + " = " + statistic + " + 1 WHERE user_id = $id", {$id: user_id}, function() {
                if(this.changes) {
                    console.log('updated ' + statistic);
                    resolve(true);
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



