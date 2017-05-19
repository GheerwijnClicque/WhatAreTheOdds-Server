var express = require('express');
var _ = require('lodash');
var app = express();
var config = require('./config')();
var http = require('http');
var bodyParser = require('body-parser');

var cors = require('cors'); // Fix CORS errors thrown by Ionic app
var ip = require('ip'); // IP address utility
var request = require('request');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('odds_database.db');

var events = require('events');
var eventEmitter = new events.EventEmitter();
//var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
//var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;

var io = require('socket.io').listen(app.listen(3000, function() {
    console.log('Listening on port: ' + port + ' and ip: ' + ipaddress);
}));

var routes = require('./routes/routes');
var achievements = require('./achievements')();
var statistics = require('./statistics')();

// app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.use('/', routes);

/*
achievements.check(1532159443463111).then(function(data) {
    console.log('new achievements: ');
    console.log(data);
}).catch(function(error) {
    console.log(error);
});
*/

var connections = {};

/*
setInterval(function() {
	// Delete rejected entries if 24h have passed
    db.serialize(function() {
    	console.log('runnning query');
        db.run("DELETE FROM challenges WHERE updated_at <= date('now', '-1 day') and rejected = 1", {}, function(error, row) {
            if(this.changes) {
                console.log('deleted some things');
            }
        });
    });
}, 1000);
*/

// Start websocket 

io.sockets.on('connection', function(socket) {
    //console.log(socket.handshake.query['data']);
    var user_id = socket.handshake.query['data'];
    console.log(user_id);
    //connections[user_id] = socket;
    socket.user_id = user_id;
    connections[user_id] = socket;

    console.log('Connected: %s sockets connected', Object.keys(connections).length);

    socket.on('disconnect', function(data) {
        deleteByVal(socket);
        console.log('Disconnected: %s sockets connected', Object.keys(connections).length);
    });


    //console.log(connections);
    //socket.broadcast.to(con.id).emit('test', 'yolo');
    //socket.connected[con.conn.id].emit('test', 'yolo');
	//socket.emit('step', {message: machine.getInfo()});
});

var broadcast = function(con) {
    io.to(con.id).emit('test', 'yolo');
};

function deleteByVal(val) {
    for (var key in connections) {
        if (connections[key] == val) delete connections[key];
    }
}

/*
var getChallengeById = function(id, event) {
    console.log('Looking for challenge');
     db.serialize(function() {
        // Get process by id
         db.all("SELECT challenges.challenge_id, challenges.challenger_id, challenges.challengee_id, challenges.challenge, challenges.created_at, challenges.updated_at, challenger.name as challenger_name, challengee.name as challengee_name, challenges.challengee_id, challenges.range, challenges.accepted, challenges.rejected, challenges.challenger_guess, challenges.challengee_guess, challenges.challenger_turn from CHALLENGES INNER JOIN USERS AS challenger ON (challenges.challenger_id=challenger.facebook_id) INNER JOIN USERS as challengee ON (challenges.challengee_id=challengee.facebook_id) WHERE challenges.challenge_id = $id", {$id: id},function(error, row) {
            //getRow = JSON.stringify(row);

            if(row !== null){
                var challenge = row[0];
                console.log('Found challenge');
                var challengerCon = findSocketByUserId(challenge.challenger_id);
                var challengeeCon = findSocketByUserId(challenge.challengee_id);

                //console.log(challengerCon);
                //console.log(challengeeCon);

                //io.sockets.emit(event, row[0]);
                try {
                    io.to(challengerCon.id).emit(event, row[0]);
                }
                catch(e) {
                    console.log(e);
                }

                try {
                    io.to(challengeeCon.id).emit(event, row[0]);
                }
                catch(e) {
                    console.log(e);
                }
                return row[0];
            }
        });
    });
}; */

var getChallengeById = function(id, event) {
  return new Promise((resolve, reject) => {
          console.log('Looking for challenge');
        db.serialize(function () {
            // Get process by id
            db.all("SELECT challenges.challenge_id, challenges.challenger_id, challenges.challengee_id, challenges.challenge, challenges.created_at, challenges.updated_at, challenger.name as challenger_name, challengee.name as challengee_name, challenges.challengee_id, challenges.range, challenges.accepted, challenges.rejected, challenges.challenger_guess, challenges.challengee_guess, challenges.challenger_turn, challenges.image_url, challenges.completed from CHALLENGES INNER JOIN USERS AS challenger ON (challenges.challenger_id=challenger.facebook_id) INNER JOIN USERS as challengee ON (challenges.challengee_id=challengee.facebook_id) WHERE challenges.challenge_id = $id", {$id: id}, function (error, row) {
                //getRow = JSON.stringify(row);

                if (row !== null) {
                    var challenge = row[0];
                    console.log('Found challenge');
                  //  var challengerCon = findSocketByUserId(challenge.challenger_id);
                  //  var challengeeCon = findSocketByUserId(challenge.challengee_id);

                    //console.log(challengerCon);
                    //console.log(challengeeCon);

                    //io.sockets.emit(event, row[0]);
                   /* try {
                        io.to(challengerCon.id).emit(event, row[0]);
                    }
                    catch (e) {
                        console.log(e);
                    }

                    try {
                        io.to(challengeeCon.id).emit(event, row[0]);
                    }
                    catch (e) {
                        console.log(e);
                    } */
                    resolve(row[0]);
                }
                else {
                    if(error) {
                        reject(error);
                    }
                    reject('Not found!');
                }
            });
        });
  });
};

var findSocketByUserId = function(id) {
    /*return connections.filter(function(connection) {
        if(connection.user_id === id) {
            console.log('found connection: ');
            console.log(connection);
            return connection;
        }
    })[0]; // return first one */
    return connections[id];
};


var updateScore = function(userId, score) {
    db.serialize(function() {
        db.each("SELECT COUNT(*) as count FROM USERS where facebook_id = $id", {$id: userId}, function(error, row) {
            if(row.count !== 0) {
                console.log('updating score...');
                console.log(userId);
                console.log(score);
                db.run("UPDATE users SET score = (score + $score) WHERE facebook_id = $id", {$score: score, $id: userId}, function() {
                    if(this.changes) {
                        console.log('updated score');
                        var userCon = findSocketByUserId(userId);

                        db.get("SELECT score FROM USERS where facebook_id = $id", {$id: userId}, function(error, row) {
                            console.log(row);
                            if(row) {
                                try {
                                    console.log('con id: ' + userCon.id);
                                    io.to(userCon.id).emit('score-update', row.score);
                                }
                                catch(e) {
                                    console.log(e);
                                }
                                console.log('score: ' + score);
                            }
                        });

                    }
                });
            }
        });
    });
}

app.post('/challenge', function(req, res) {
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

                        var challenge = getChallengeById(this.lastID, 'challenge-add').then((row) => {
                            var challengerCon = findSocketByUserId(row.challenger_id);
                            var challengeeCon = findSocketByUserId(row.challengee_id);
                            try {
                                io.to(challengerCon.id).emit('challenge-add', row);
                             }
                             catch (e) {
                                console.log(e);
                             }

                             try {
                                io.to(challengeeCon.id).emit('challenge-add', row);
                             }
                             catch (e) {
                                console.log(e);
                             }
                            //res.send(row);
                        }, (error) => {
                            console.log('error: ' + error);
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

// Submit the desired range + accept the challenge
app.post('/challenge/accept', function(req, res) {
    var challengeId = req.body.challenge;
    var range = req.body.range;
    var userId = req.body.user; // TODO: could be removed?  + also remove from /guess!

    db.serialize(function() {
        db.each("SELECT COUNT(*) as count FROM challenges where challenge_id = $id and challengee_id = $userId", {$id: challengeId, $userId: userId}, function(error, row) {
            if(row.count !== 0) {
                db.run("UPDATE challenges SET range = $range, accepted = $accepted, updated_at = $now, challenger_turn = (NOT challenger_turn) WHERE challenge_id = $id ", {$range: range, $accepted: 1, $now: +new Date(), $id: challengeId}, function() {
                    if(this.changes) res.sendStatus(200);
                    if(this.changes) {
                        console.log('challenge updated with range: ' + range);
                        getChallengeById(challengeId, 'challenge-update').then((row) => {
                            var challengerCon = findSocketByUserId(row.challenger_id);
                        var challengeeCon = findSocketByUserId(row.challengee_id);
                        try {
                            io.to(challengerCon.id).emit('challenge-update', row);
                        }
                        catch (e) {
                            console.log(e);
                        }

                        try {
                            io.to(challengeeCon.id).emit('challenge-update', row);

                            statistics.update(row.challengee_id, 'accepted_challenges').then((resolved) => {
                                if(resolved) {
                                    achievements.check(row.challengee_id).then((data) => {
                                        io.to(challengeeCon.id).emit('achievements-update', data);
                                    }).catch((error) => {
                                        console.log('Error while updating achievements: ' + error);
                                    });
                                }
                            }).catch((error) => {
                                console.log('Error while updating statistics (accept): ' + error);
                            });
                        }
                        catch (e) {
                            console.log(e);
                        }

                        //Update user score
                        updateScore(row.challengee_id, 10);
                    }, (error) => {
                            console.log('error: ' + error);
                        });
                    }
                });
            }
            else {
                console.log("update failed, no entry found");
                res.sendStatus(409); // Conflict status code
            }
        });
    });
});

app.post('/challenge/decline', function(req, res) {
    var challengeId = req.body.challenge;

    db.serialize(function() {
        db.each("SELECT COUNT(*) as count FROM challenges where challenge_id = $id", {$id: challengeId}, function(error, row) {

            // if(row.count !== 0) {
                db.run("UPDATE challenges SET rejected = $rejected, updated_at = $now WHERE challenge_id = $id ", {$rejected: 1, $now: +new Date(), $id: challengeId}, function() {
                    console.log('decline: ' + challengeId);
                    //if(this.changes) res.sendStatus(200);
                    console.log(this.changes)
                    if(this.changes) {
                        console.log('declined challenge');
                        getChallengeById(challengeId, 'challenge-update').then((row) => {
                            console.log('test');
                            var challengerCon = findSocketByUserId(row.challenger_id);
                            var challengeeCon = findSocketByUserId(row.challengee_id);
                            try {
                                io.to(challengerCon.id).emit('challenge-update', row);
                            }
                            catch (e) {
                                console.log(e);
                            }

                            try {
                                statistics.update(row.challengee_id, 'declined_challenges').then((resolved) => {
                                    if(resolved) {
                                        achievements.check(row.challengee_id).then((data) => {
                                            console.log('socketje');
                                            io.to(challengeeCon.id).emit('achievements-update', data);
                                        }).catch((error) => {
                                            console.log('Error while updating achievements: ' + error);
                                        });
                                    }
                                }).catch((error) => {
                                    console.log('Error while updating statistics (decline): ' + error);
                                });

                                io.to(challengeeCon.id).emit('challenge-update', row);
                            }
                            catch (e) {
                                console.log(e);
                            }
                            // Update user score
                            updateScore(row.challengee_id, -10);
                        }, (error) => {
                            console.log('error: ' + error);
                        });
                    }
                });
           /* }
            else {
                console.log("update failed, no entry found");
                res.sendStatus(409); // Conflict status code
            } */
        });
    });
});

app.post('/challenge/guess', function(req, res) {
    var challengeId = req.body.challenge;
    var guess = req.body.guess;
    var userId = req.body.user;

    console.log('id: ' + challengeId);
    console.log('gess: ' + guess);
    console.log('user: ' + userId);

    db.serialize(function() {
        db.get("SELECT * FROM challenges where challenge_id = $id", {$id: challengeId}, function(error, row) {
            var query = 'UPDATE challenges SET ';
            if(row && row.challenger_id === parseInt(userId)) {
                query += ('challenger_guess = ' + guess + ', challenger_turn = 0 WHERE challenge_id = $id');
            }
            else if(row && row.challengee_id === parseInt(userId)) {
                query += ('challengee_guess = ' + guess + ', challenger_turn = 1 WHERE challenge_id = $id');
            }
            db.run(query, {$id: challengeId}, function() {
                if(this.changes) res.sendStatus(200);
                if(this.changes) {
                    console.log('updated challenge');
                    getChallengeById(challengeId, 'challenge-update').then((row) => {
                    var challengerCon = findSocketByUserId(row.challenger_id);
                    var challengeeCon = findSocketByUserId(row.challengee_id);
                    try {
                        io.to(challengerCon.id).emit('challenge-update', row);
                    }
                    catch (e) {
                        console.log(e);
                    }

                    try {
                        io.to(challengeeCon.id).emit('challenge-update', row);
                    }
                    catch (e) {
                        console.log(e);
                    }
                }, (error) => {
                        console.log('error: ' + error);
                    });
                }
            });
        });
    });
});

app.get('/:user_id/score', function(req, res) {
    var userID = req.params.user_id;
    var getRow;
    db.serialize(function() {
        // Get all processes of specified user
        db.get("SELECT score from USERS WHERE facebook_id = $id", {$id: userID},function(error, row) {
            getRow = row;
            if(row) {
                console.log('score:');
                console.log(row.score);
                var score = row.score;
                res.send(JSON.stringify(score));
            }
            else {
                console.log('no score found');
            }

        });
    });
});


app.post('/image', function(req, res) {
    var userId = req.body.user;
    var challengeId = req.body.challenge;
    var url = req.body.url;

    console.log(userId);
    console.log(challengeId);
    console.log(url);
    db.serialize(function() {
        db.get("SELECT * FROM challenges where challenge_id = $id && challengee_id = $user", {$id: challengeId, $user: userId}, function(error, row) {
            db.run("UPDATE challenges SET updated_at = $now, challenger_turn = (NOT challenger_turn), image_url = $url WHERE challenge_id = $id ", {$now: +new Date(), $id: challengeId, $url: url}, function() {
                if(this.changes) res.sendStatus(200);
                if(this.changes) {
                    console.log('updated challenge');
                    getChallengeById(challengeId, 'challenge-update').then((row) => {
                        var challengerCon = findSocketByUserId(row.challenger_id);
                    var challengeeCon = findSocketByUserId(row.challengee_id);
                    try {
                        io.to(challengerCon.id).emit('challenge-update', row);
                    }
                    catch (e) {
                        console.log(e);
                    }

                    try {
                        io.to(challengeeCon.id).emit('challenge-update', row);
                    }
                    catch (e) {
                        console.log(e);
                    }
                }, (error) => {
                        console.log('error: ' + error);
                    });
                }
            });
        });
    });
});

app.post('/completed', function(req, res) {
    var userId = req.body.user;
    var challengeId = req.body.challenge;
    var completed = req.body.completed;


    console.log(userId);
    console.log(challengeId);
    console.log(completed);

    db.serialize(function() {
        db.get("SELECT * FROM challenges where challenge_id = $id && challenger_id = $user", {$id: challengeId, $user: userId}, function(error, row) {
            db.run("UPDATE challenges SET updated_at = $now, challenger_turn = (NOT challenger_turn), completed = $completed WHERE challenge_id = $id ", {$now: +new Date(), $id: challengeId, $completed: completed}, function() {
                if(this.changes) res.sendStatus(200);
                if(this.changes) {
                    console.log('updated challenge');
                    getChallengeById(challengeId, 'challenge-update').then((row) => {
                        var challengerCon = findSocketByUserId(row.challenger_id);
                        var challengeeCon = findSocketByUserId(row.challengee_id);
                        try {
                            io.to(challengerCon.id).emit('challenge-update', row);
                        }
                        catch (e) {
                            console.log(e);
                        }

                        try {
                            if(!completed) {
                                statistics.update(row.challengee_id, 'failed_challenges').then((resolved) => {
                                    if(resolved) {
                                        achievements.check(row.challengee_id).then((data) => {
                                            io.to(challengeeCon.id).emit('achievements-update', data);
                                        }).catch((error) => {
                                            console.log('Error while updating achievements: ' + error);
                                        });
                                    }
                                }).catch((error) => {
                                    console.log('Error while updating statistics (accept): ' + error);
                                });
                            }

                            io.to(challengeeCon.id).emit('challenge-update', row);
                        }
                        catch (e) {
                            console.log(e);
                        }
                        if(completed) {
                            updateScore(row.challengee_id, 10);
                        } else {
                            updateScore(row.challengee_id, -10);
                        }
                    }, (error) => {
                        console.log('error: ' + error);
                    });
                }
            });
        });
    });
});

/*
app.post('/score/update', function(req, res) {
    var score = req.body.score;
    var userId = req.body.user;

    db.serialize(function() {

        db.get("SELECT * FROM USERS where facebook_id = $id", {$id: userId}, function(error, row) {
            var query = 'UPDATE challenges SET ';
            if(row && row.challenger_id === parseInt(userId)) {
                query += ('challenger_guess = ' + guess + ', challenger_turn = 0 WHERE challenge_id = $id');
            }
            else if(row && row.challengee_id === parseInt(userId)) {
                query += ('challengee_guess = ' + guess + ', challenger_turn = 1 WHERE challenge_id = $id');
            }
            db.run(query, {$id: challengeId}, function() {
                if(this.lastID) res.sendStatus(200);
                if(this.lastID) {
                    console.log('updated challenge');
                    var challenge = getChallengeById(this.lastID, 'challenge-update');
                }
            });
        });
    });
});

*/



/*
// Set the headers
var headers = {
    // 'User-Agent':       'Super Agent/0.0.1',
    'Content-Type':     'application/x-www-form-urlencoded'
};

// Configure the request
var options = {
    url: 'http://gheerwijnclicque.ikdoeict.be/api.php',
    method: 'POST',
    headers: headers,
    form: {'ip': ip.address()}
};

// Start the request
request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        // Print out the response body
        console.log(body);
    }
});
*/


// su pi -c 'node /home/pi/Project/Server/server.js < /dev/null &' -> not working


// http://www.instructables.com/id/Nodejs-App-As-a-RPI-Service-boot-at-Startup/?ALLSTEPS
// update-rc.d -f myService remove
