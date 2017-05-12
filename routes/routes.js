var express = require('express');
var _ = require('lodash');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('odds_database.db');
var achievements = require('../achievements')();

//var io = require('socket.io');

var router = express.Router();

router.get('/', function(req, res) {
	res.status(200).send('What are the odds - The Game');
    //io.sockets.emit('test');
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
                        }); //117195915492023
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

/*
router.post('/challenge', function(req, res) {
    var challengerId = req.body.challengerId;
    var challengeeId = req.body.challengeeId;
    var challenge = req.body.challenge;

    console.log('user: ' + challengerId);
    console.log('friend: ' + challengeeId);
    console.log('challenge: ' + challenge);

    db.serialize(function() {
        db.each("SELECT COUNT(*) as count FROM challenges where challenger_id = $user and challengee_id = $friend and challenge = $challenge", {$user: challengerId, $friend: challengeeId, $challenge: challenge}, function(error, row) {

            if(row.count === 0) {
                console.log('insert!ç');

                db.run("INSERT INTO challenges(challenger_id, challengee_id, challenge, accepted, rejected, created_at, challenger_turn) VALUES ($user, $friend, $challenge, $accepted, $rejected, $created, 0)", {$user: challengerId, $friend: challengeeId, $challenge: challenge, $accepted: 0, $rejected: 0, $created: Math.floor(Date.now() / 1000)}, function() {
                    if(this.lastID) res.sendStatus(200);
                    if(this.lastID) {
                        console.log('challenge added to database!');


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
*/

router.get('/:user_id/challenges', function(req, res) {
    var userID = req.params.user_id;
	console.log('get challenges: ');
	console.log(userID);
    var getRow;
    db.serialize(function() {
        // Get all processes of specified user
        db.all("SELECT challenges.challenge_id, challenges.challenger_id, challenges.challengee_id, challenges.challenge, challenges.created_at, challenges.updated_at, challenger.name as challenger_name, challengee.name as challengee_name, challenges.challengee_id, challenges.range, challenges.accepted, challenges.rejected, challenges.challenger_guess, challenges.challengee_guess, challenges.challenger_turn, challenges.image_url, challenges.completed from CHALLENGES INNER JOIN USERS AS challenger ON (challenges.challenger_id=challenger.facebook_id) INNER JOIN USERS as challengee ON (challenges.challengee_id=challengee.facebook_id) WHERE challenges.challengee_id = $id OR challenges.challenger_id = $id", {$id: userID},function(error, row) {
            getRow = row;
            //console.log(row);
            res.send(JSON.stringify(getRow));
        });
    });
});

router.get('/users', function(req, res) {
	console.log('get users');
    var getRow;
    db.serialize(function() {
        // Get all processes of specified user
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
        // Get all processes of specified user
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
/*
// Get all processes of user
router.get('/:id/processes', function(req, res) {
	var getRow;

	// User id from get request
	var userID = req.params.id;
	db.serialize(function() {
		// Get all processes of specified user
		db.all("SELECT * from PROCESSES WHERE userid = $id", {$id: userID},function(error, row) {
			getRow = row;
			res.send(JSON.stringify(getRow));
		});
	});
});

// Add new process
router.post('/addprocess', function(req, res) {
	var processName = req.body.name;
	var processDescription = req.body.description;
	var userID = req.body.id;

	db.serialize(function() {
		db.each("SELECT COUNT(*) as count FROM processes where process_name = $name and userid = $id", {$name: processName, $id: userID}, function(error, row) {
			if(row.count === 0) { // Insert if processname doesn't exist yet for current user
				db.run("INSERT INTO processes(userid, process_name, description, favorite) VALUES ($id, $name, $description, $favorite)", {$id: userID, $name: processName, $description: processDescription, $favorite: false}, function() {
					lastProcessId = this.lastID;
					if(this.lastID) res.sendStatus(200);
				});
			}
			else {
				console.log("already exists");
				res.sendStatus(409);
			}
		});
	});
});
*/


// Register a new user
router.post('/adduser', function(req, res) {
	var userName = req.body.name;
	var userPassword = passwordHash.generate(req.body.password);
	var userEmail = req.body.email;

	db.serialize(function() {
		db.each("SELECT COUNT(*) as count FROM users where username = $name or email = $email", {$name: userName, $email: userEmail}, function(error, row) {
			if(row.count === 0) {
				db.run("INSERT INTO users(username, password, email) VALUES ($username, $password, $email)", {$username: userName, $password: userPassword, $email: userEmail}, function() {
					if(this.lastID) res.sendStatus(200);
				});
			}
			else {
				console.log("already exists");
				res.sendStatus(409); // Conflict status code
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


/*
// Favorite/unfavorite a process
router.get('/:id/favorite/', function(req, res) {
	var processID = req.params.id;

	db.serialize(function() {
		db.run("UPDATE processes SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END WHERE processid = $id", {$id: processID}, function(error, row) {
			if(this.changes) res.sendStatus(200);
		});
	});
});

// Get Favorite processes for specific user
router.get('/:id/favorites/', function(req, res) {
	var userID = req.params.id;
	var getRow;

	db.serialize(function() {
		db.all("SELECT * from PROCESSES WHERE userid = $id AND favorite = 1", {$id: userID},function(error, row) {
			getRow = row;
			res.send(JSON.stringify(getRow));
		});
	});
});
*/


module.exports = router;
