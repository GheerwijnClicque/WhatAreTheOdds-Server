var express = require('express');
var _ = require('lodash');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('odds_database.db');
var achievements = require('../achievements')();

var router = express.Router();

router.get('/', function(req, res) {
	res.status(200).send('What are the odds - The Game');
});

router.post('/user/add', function(req, res) {
    var userId = req.body.id;
    var userName = req.body.name;

    db.serialize(function() {
        db.each("SELECT COUNT(*) as count FROM users where name = $name or facebook_id = $id", {$name: userName, $id: userId}, function(error, row) {
            if(row.count === 0) {
                db.run("INSERT INTO users(facebook_id, name, score) VALUES ($id, $name, 0)", {$id: userId, $name: userName}, function() {
                    if(this.lastID) {
                        db.run("INSERT INTO statistics(user_id, completed_challenges, failed_challenges, declined_challenges) VALUES ($id, 0, 0, 0)", {$id: userId}, function() {
                            if(this.lastID) res.sendStatus(200);
                        });
                    }
                });
            }
            else {
                console.log("already exists");
                res.sendStatus(409); // Conflict status code
            }
        });
    });
});

router.post('/user/friends/add', function(req, res) {
    var userId = req.body.user;
    var friendId = req.body.friend;

    var accepted = 0;
	console.log('user: ' + userId);
	console.log('friend: ' + friendId);
    db.serialize(function() {
        db.each("SELECT COUNT(*) as count FROM friends where user_id = $user and friend_id = $friend", {$user: userId, $friend: friendId}, function(error, row) {
            if(row.count === 0) {
                db.run("INSERT INTO friends(user_id, friend_id, accepted) VALUES ($user, $friend, $accepted)", {$user: userId, $friend: friendId, $accepted: accepted}, function() {
                    if(this.lastID) res.sendStatus(200);
                    console.log('friendship added to database!');
                });
            }
            else {
                console.log("already exists");
                res.sendStatus(409); // Conflict status code
            }
        });
    });
});

router.get('/:user_id/friends', function(req, res) {
    var userID = req.params.user_id;
    var getRow;
    db.serialize(function() {
        // Get all processes of specified user
        db.all("SELECT * from FRIENDS INNER JOIN USERS ON friends.friend_id=users.facebook_id WHERE friends.user_id = $id", {$id: userID},function(error, row) {
            getRow = row;
            //console.log(row);
            res.send(JSON.stringify(getRow));
        });
    });
});

router.get('/:user_id/challenges', function(req, res) {
    var userID = req.params.user_id;
	console.log('get challenges: ');
	console.log(userID);
    var getRow;
    db.serialize(function() {
        db.all("SELECT challenges.challenge_id, challenges.challenger_id, challenges.challengee_id, challenges.challenge, challenges.created_at, challenges.updated_at, challenger.name as challenger_name, challengee.name as challengee_name, challenges.challengee_id, challenges.range, challenges.accepted, challenges.rejected, challenges.challenger_guess, challenges.challengee_guess, challenges.challenger_turn, challenges.media_file, challenges.completed from CHALLENGES INNER JOIN USERS AS challenger ON (challenges.challenger_id=challenger.facebook_id) INNER JOIN USERS as challengee ON (challenges.challengee_id=challengee.facebook_id) WHERE challenges.challengee_id = $id OR challenges.challenger_id = $id", {$id: userID},function(error, row) {
            getRow = row;
            res.send(JSON.stringify(getRow));
        });
    });
});

router.get('/users', function(req, res) {
	console.log('get users');
    var getRow;
    db.serialize(function() {
        db.all("SELECT * from USERS",function(error, row) {
            getRow = row;
            res.send(JSON.stringify(getRow));
        });
    });
});


router.get('/:user_id/achievements', function(req, res) {
    var userID = req.params.user_id;
    var getRow;
    db.serialize(function() {
        db.all("SELECT * from USER_HAS_ACHIEVEMENTS WHERE user_id = $id", {$id: userID},function(error, row) {
            getRow = row;
            if(row) {
                console.log('achievements:');
                console.log(row);

                let ads = achievements.getAchievementsAsObjects();
                                
                ads.forEach(function(achievement, index) {
                    row.forEach(function(entry) {
                        if(achievement.name === entry.name) {
                            ads[index] = entry;
                        }
                    });
                });
                res.send(JSON.stringify(ads))
            }
            else {
                console.log('no achievements found');
                res.send(JSON.stringify(achievements.getAchievementsAsObjects()));
            }
        });
    });
});

router.get('/highscores', function(req, res) {
	db.serialize(function() {
		db.all("SELECT * from USERS ORDER BY score DESC", function(error, row) {
			console.log('highscores');
			console.log(row);
			res.send(JSON.stringify(row));
		});
	});
});

router.get('/:user_id/statistics', function(req, res) {
    var userID = req.params.user_id;
    console.log('get statistics: ');
    console.log(userID);
    var getRow;
    var that = this;
    db.serialize(function() {
        // Get all processes of specified user
        db.get("SELECT * from STATISTICS WHERE user_id = $id", {$id: userID},function(error, row) {
            getRow = row;
            if(row) {
                getScore(userID).then((data) => {
                    row['score'] = data.score;
                    res.send(JSON.stringify(row));
                    console.log(row);
                }).catch((error) => {
                    console.log(error);
                });
            }

        });
    });
});

var getScore = function(id) {
    return new Promise(function(resolve, reject) {
        db.serialize(function() {
        db.get("SELECT score FROM USERS where facebook_id = $id", {$id: id}, function(error, row) {
            if(row) {
                resolve(row);
            }
            else {
                reject(error);
            }
        });
    });
    });
}

module.exports = router;
