var util = require('util');
var EventEmitter = require('events').EventEmitter;
var achievements = new EventEmitter();
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('odds_database.db');

var Achievement = require('./Achievement');

achievements.getAchievements = function() {
	return [
		new Achievement(1, 'Nay-sayer', '5 declined challenges',function(statistics) { return statistics.declined_challenges >= 5}), // 5 declined challenges
		new Achievement(2, 'Braveheart', '10 accepted challenges',function(statistics) { return (statistics.failed_challenges + statistics.completed_challenges) >= 10}), // 10 accepted challenges
		//new Achievement(3, 'Mindreader', '5 same guesses',function(statistics) { return statistics >= 5}), // 5 same guesses
		new Achievement(4, 'Scaredy cat', '10 declined challenges',function(statistics) { return statistics.declined_challenges >= 10}), // 
		new Achievement(5, 'Failure', '10 failed challenges',function(statistics) { return statistics.failed_challenges >= 10}), // 10 failed challenges
		new Achievement(6, 'Started from the bottom', '20 completed challenges',function(statistics) { return statistics.completed_challenges >= 20}) // 10 failed challenges

		// Doubter (when accepting but clicking cancel?)
	]
}

achievements.getAchievementsAsObjects = function() {
	return this.getAchievements().map(function(achievement) {
		return achievement.toObject();
	});
}

achievements.check = function(user_id) {
	console.log('id: ' + user_id);

	var that = this;
	return new Promise(function(resolveMain, rejectMain) {
		var newAchievements = new Array();

		db.serialize(function() {
			db.get("SELECT * from STATISTICS WHERE user_id = $id", {$id: user_id},function(error, statistics) {
				var achievements = that.calculate(statistics);
				var promises = [];

				achievements.forEach(function(achievement) {
					promises.push(new Promise(function(resolve, reject) {
						that.getUserAchievement(user_id, achievement).then(function(data) {
								if(data !== null) {
									that.insertAchievement(user_id, achievement).then(function(data) {
										resolve(data);
										//resolve({id: data.id, name: data.name, rule: data.rule});
									}).catch(function(error) {
										console.log(error)
										reject(error);
									});		
								}
							}).catch(function(error) {
								resolve();
							});
					}));
				});

				Promise.all(promises).then((data) => {
					resolveMain(data.filter(Boolean));
				}).catch((error) => {
					console.log('error: ');
					console.log(error);
				});		
			});
		});
	});
}

achievements.insertAchievement = function(user_id, achievement) {
	return new Promise(function(resolve, reject) {
		db.run("INSERT INTO USER_HAS_ACHIEVEMENTS(user_id, achievement_id, name, rule, achieved) VALUES ($user_id, $achievement_id, $name, $rule, 1)", {$user_id: user_id, $achievement_id: achievement.getId(), $name: achievement.getName(), $rule: achievement.getRule()}, function(error, row) {
			if(this.lastID) {
				resolve(achievement);
				console.log('achievement inserted');
			} 
			reject('Error inserted');
		});
	});
}

achievements.getUserAchievement = function(user_id, achievement) {
	return new Promise(function(resolve, reject) {
		db.serialize(function() {
			db.get("SELECT * FROM USER_HAS_ACHIEVEMENTS WHERE user_id = $user_id AND achievement_id = $achievement_id AND name = $name AND rule = $rule", {$user_id: user_id, $achievement_id: achievement.getId(), $name: achievement.getName(), $rule: achievement.getRule()}, function(error, row) {
				if(!row) {
					resolve(row);
				}
				reject('error user achievement getting shit');
			});
		});
	}); 
}

achievements.calculate = function(statistics) {
	var achievements = this.getAchievements();
	var achieved = [];

	achievements.forEach(function(achievement) {
		if(achievement.achieved(statistics)) {
			achieved.push(achievement);
		}
	});
	return achieved;
}


module.exports = function() {
	return achievements;
};



