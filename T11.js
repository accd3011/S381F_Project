const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const fs = require('fs');
const formidable = require('express-formidable');
const { constants } = require('buffer');
const mongourl = '';
const dbName = 'project';

app.set('view engine', 'ejs');

const SECRETKEY = 'I want to pass COMPS381F';

var users = new Array(
	{name: 'developer', password: 'developer'},
    {name: 'guest', password: 'guest'},
    {name: 'demo', password:'demo'},
    {name: 'student', password:'student'}
);

app.set('view engine','ejs');

const insertDocument = (updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    
  	client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        const options = {upsert: true};
         db.collection('restaurant').insertOne(updateDoc,
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Insert = (req, res, criteria) => {
    
    //const form = new formidable.IncomingForm(); 
    //form.parse(req, (err, fields, files) => {
        let updateDoc = {};
       
        if (req.fields.name != ''){
        updateDoc['name'] = req.fields.name; 
	updateDoc['address']= {'building':'', 'coord':'', 'street':'', 'zipcode':''};
        updateDoc['restaurant_id'] = req.fields.restaurant_id; 
	updateDoc.address.building = req.fields.building;
        updateDoc.address.coord = req.fields.coord;
        updateDoc.address.street = req.fields.street;
        updateDoc.address.zipcode = req.fields.zipcode;
        updateDoc['borough'] = req.fields.borough;
        updateDoc['cuisine'] = req.fields.cuisine;
        updateDoc['author'] = req.session.username;
        updateDoc['rating'] = [{'score':'', 'author':''}];
        console.log(updateDoc); 
	
	if (req.files.filetoupload.size > 0) {
            fs.readFile(req.files.filetoupload.path, (err,data) => {
                assert.equal(err,null);
                updateDoc['photo'] = new Buffer.from(data).toString('base64');
                insertDocument(updateDoc, (results) => {
                    res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})
                });
            });
        } else {
            insertDocument(updateDoc, (results) => {
                res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})
            });
        }
        } else {
            res.writeHead(200, {"content-type":"text/html"});
            res.write(`<html><body><p>A restaurant must have its name!<p><br>`);
            res.end('<a href="/insert">back</a></body></html>');
        }
       
       
}


const findAuthor = (res, criteria, userid, callback) =>{
        const client = new MongoClient(mongourl);
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            console.log("Checking is user = author");
            const db = client.db(dbName);
    
            findDocument(db, DOCID, (docs) => {
                client.close();
                console.log("Closed DB connection");
                if (docs[0].author == userid){
                    handle_Edit(res,criteria);
                } else {
                    res.writeHead(200, {"content-type":"text/html"});
                    res.write(`<html><body><p>You are not the author!<p><br>`);
                    res.end('<a href="/">back</a></body></html>');
                }
            });
        });
}

const findRated = (res, criteria, userid, callback) =>{
    const client = new MongoClient(mongourl);
    let DOCID = {};
    DOCID['_id'] = ObjectID(criteria._id)
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        console.log("Checking is user = author");
        const db = client.db(dbName);

        findDocument(db, DOCID, (docs) => {
            client.close();
            console.log("Closed DB connection");
            if(docs[0].rating.length == undefined){handle_Rate(res, criteria);}
            for(var i = 0; i < docs[0].rating.length; i++){
                if (docs[0].rating[i].author != userid){
                    console.log('notauthor');
                } else if(docs[0].rating[i].author == userid){
                    res.writeHead(200, {"content-type":"text/html"});
                    res.write(`<html><body><p>You have already rated!<p><br>`);
                    res.end('<a href="/">Home</a></body></html>');
                    break;
                }
                }

            })
            handle_Rate(res, criteria);
    });
}

const findDelete = (res, criteria, userid, callback) =>{
    const client = new MongoClient(mongourl);
    let DOCID = {};
    DOCID['_id'] = ObjectID(criteria._id)
    let AUTHOR ={};
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        console.log("Checking is user = author");
        const db = client.db(dbName);

        findDocument(db, DOCID, (docs) => {
            client.close();
            console.log("Closed DB connection");
            if (docs[0].author == userid){
                handle_Delete(res, criteria);
            } else {
                res.writeHead(200, {"content-type":"text/html"});
                res.write(`<html><body><p>You are not the author!<p><br>`);
                res.end('<a href="/">back</a></body></html>');
            }
        });
    });
}

const handle_Delete = (res,req, callback) =>{
        let DOCID = {};
        DOCID['_id'] = ObjectID(req._id);
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            db.collection('restaurant').deleteOne(DOCID,(err,results) => {
                assert.equal(err,null)
                client.close()
                res.status(200).render('deleted');
            })
        });
    }

const handle_Rate = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        let cursor = db.collection('restaurant').find(DOCID);
        cursor.toArray((err,docs) => {
        client.close();
        assert.equal(err,null);
        res.status(200).render('rate',{restaurant: docs[0]});
                    
        });
    });
}

const handle_Rating = (req, res, criteria) => {
    var a;
    var DOCID = {};
    const client = new MongoClient(mongourl);
    DOCID['_id'] = ObjectID(req.fields._id);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, DOCID, (docs) => {

            if(req.fields.score < 0 || req.fields.score >10){
                res.writeHead(200, {"content-type":"text/html"});
                res.write(`<html><body><p>Score need to between 0 to 10!<p><br>`);
                res.end('<a href="/">back</a></body></html>');
            } else{
                var updateDoc = {};
                updateDoc['rating']= {'score':'', 'author':''};
                updateDoc.rating.score = req.fields.score;
                updateDoc.rating.author = req.session.username;
                console.log(updateDoc);
                db.collection('restaurant').update(DOCID, {$push:updateDoc}, () => {
                res.status(200).render('info', {message: `Rated document(s)`})
            });
            }  
            client.close();
            console.log("Closed DB connection");
        });
    });
    
}




const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('restaurant').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}

const handle_Find = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('list',{username: req.session.username, nRestaurants: docs.length, restaurant: docs});
        });
    });
}

const handle_Details = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('details', {restaurant: docs[0]});
        });
    });
}

const handle_Edit = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        let cursor = db.collection('restaurant').find(DOCID);
        cursor.toArray((err,docs) => {
            client.close();
            assert.equal(err,null);
            res.status(200).render('edit',{restaurant: docs[0]});
        });
    });
}

const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurant').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Update = (req, res, criteria) => {

        var DOCID = {};
        DOCID['_id'] = ObjectID(req.fields._id);
        var updateDoc = {};
        if (req.fields.name != ''){
        updateDoc['restaurant_id'] = req.fields.restaurant_id;
        updateDoc['name'] = req.fields.name;
        updateDoc['address.building'] = req.fields.building;
        updateDoc['address.coord'] = req.fields.coord;
        updateDoc['address.street'] = req.fields.street;
        updateDoc['address.zipcode'] = req.fields.zipcode;
        updateDoc['borough'] = req.fields.borough;
        updateDoc['cuisine'] = req.fields.cuisine;

        if (req.files.filetoupload.size > 0) {
            fs.readFile(req.files.filetoupload.path, (err,data) => {
                assert.equal(err,null);
                updateDoc['photo'] = new Buffer.from(data).toString('base64');
                updateDocument(DOCID, updateDoc, (results) => {
                    res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})

                });
            });
        }else{
            updateDocument(DOCID, updateDoc, (results) => {
                res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})

            })
        }} else {
            res.writeHead(200, {"content-type":"text/html"});
            res.write(`<html><body><p>A restaurant must have its name!<p><br>`);
            res.end('<a href="/">back</a></body></html>');
        }

}

app.use((req,res,next) => {
    let d = new Date();
    console.log(`TRACE: ${req.path} was requested at ${d.toLocaleDateString()}`);  
    next();
})

app.use(session({
    name: 'loginSession',
    keys: [SECRETKEY]
  }));

app.use(formidable ());
  
// support parsing of application/json type post data

app.get('/', (req,res) => {
	console.log(req.session);
	if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
	} else {
		res.redirect('/find');
	}
})

app.get('/create', (req,res) => {
	res.status(200).render('create',{});
})

app.get('/login', (req,res) => {
	res.status(200).render('login',{});
})

app.get('/logout', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
	}
	req.session = null;   // clear cookie-session
	res.redirect('/');
})

app.get('/find', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
	}
    handle_Find(req, res, req.query.docs);
})

app.get('/details', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
	}
    handle_Details(res, req.query);
})

app.get('/insert', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    res.status(200).render('insert',{});
})

app.post('/insert',(req,res) => {
    handle_Insert(req, res);
})

app.get('/edit', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    findAuthor(res, req.query ,req.session.username);
})

app.get('/search', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    res.status(200).render('search',{});
})

app.get('/delete', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    findDelete(res, req.query, req.session.username);
})

app.post('/search_name', (req,res)=>{
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    var doc = {};
    doc['name'] = req.fields.name;
    handle_Find(req, res, doc);
})

app.post('/search_cuisine', (req,res)=>{
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    var doc = {};
    doc['cuisine'] = req.fields.cuisine;
    handle_Find(req, res, doc);
})

app.post('/search_borough', (req,res)=>{
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    var doc = {};
    doc['borough'] = req.fields.borough;
    handle_Find(req, res, doc);
})

app.get('/rate', (req, res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    findRated(res, req.query ,req.session.username);
})

app.post('/update', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    handle_Update(req, res, req.query);
})

app.post('/rating', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    }
    handle_Rating(req, res, req.query);
})

app.post('/login', (req,res) => {
    console.log(req.fields.password);
    users.forEach((user) => {
            console.log(req.fields.password);
            if (user.name == req.fields.name && user.password == req.fields.password) {
                // correct user name + password
                // store the following name/value pairs in cookie session
                req.session.authenticated = true;        // 'authenticated': true
                req.session.username = req.fields.name;	 // 'username': req.body.name		
            } 
        })
	res.redirect('/');
})

app.post('/create', (req,res) => {
	users.forEach((user) => {

		if (user.name == req.fields.name) {
            res.writeHead(200, {"content-type":"text/html"});
            res.write(`<html><body><p>Account already exists!<p><br>`);
            res.end('<a href="/">back</a></body></html>');
            res.redirect('/create');
        } else if(user.name != req.fields.name){
            user.name = req.fields.name;
            user.password = req.fields.password;
            res.writeHead(200, {"content-type":"text/html"});
            res.write(`<html><body><p>Successful create a account!<p><br>`);
            res.end('<a href="/">Login Here</a></body></html>');
            res.redirect('/login');
        }
	})
	
})

app.get('/leaflet', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    };
    console.log(req.query.coord);
    res.status(200).render('leaflef',{coord:req.query.coord,
                                        zoom:req.query.zoom ?req.query.zoom : 15
    });
})

//
// RESTful
//

/*  CREATE
curl -X POST -H "Content-Type: application/json" --data '{"bookingid":"BK999","mobile":"00000000"}' localhost:8099/api/booking/BK999

curl -X POST -F 'bookingid=BK999' -F "filetoupload=@image.png" localhost:8099/api/booking/BK999
*/
app.post('/api/restaurant/:restaurant_id', (req,res) => {
    if (req.params.restaurant_id) {
        console.log(req.body)
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null,err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);
            let newDoc = {};
            newDoc['restaurant_id'] = req.fields.restaurant_id;
            newDoc['name'] = req.fields.name;
            if (req.files.filetoupload && req.files.filetoupload.size > 0) {
                fs.readFile(req.files.filetoupload.path, (err,data) => {
                    assert.equal(err,null);
                    newDoc['photo'] = new Buffer.from(data).toString('base64');
                    db.collection('bookings').insertOne(newDoc,(err,results) => {
                        assert.equal(err,null);
                        client.close()
                        res.status(200).end()
                    })
                });
            } else {
                db.collection('restaurant').insertOne(newDoc,(err,results) => {
                    assert.equal(err,null);
                    client.close()
                    res.status(200).end()
                })
            }
        })
    } else {
        res.status(500).json({"error": "missing bookingid"});
    }
})

/* READ
curl -X GET http://localhost:8099/api/booking/BK001
*/
app.get('/api/restaurant/name/:name', (req,res) => {
    if (req.params.name) {
        let criteria = {};
        criteria['name'] = req.params.name;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "name"});
    }
})

app.get('/api/restaurant/borough/:borough', (req,res) => {
    if (req.params.borough) {
        let criteria = {};
        criteria['borough'] = req.params.borough;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "borough"});
    }
})

app.get('/api/restaurant/cuisine/:cuisine', (req,res) => {
    if (req.params.cuisine) {
        let criteria = {};
        criteria['cuisine'] = req.params.cuisine;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "cuisine"});
    }
})

/*  UPDATE
curl -X PUT -H "Content-Type: application/json" --data '{"mobile":"88888888"}' localhost:8099/api/booking/BK999

curl -X PUT -F "mobile=99999999" localhost:8099/api/booking/BK999 
*/
app.put('/api/restaurant/:restaurant_id', (req,res) => {
    if (req.params.restaurant_id) {
        console.log(req.body)
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null,err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            let criteria = {}
            criteria['restaurant_id'] = req.params.bookingid

            let updateDoc = {};
            Object.keys(req.fields).forEach((key) => {
                updateDoc[key] = req.fields[key];
            })
            console.log(updateDoc)
            if (req.files.filetoupload && req.files.filetoupload.size > 0) {
                fs.readFile(req.files.filetoupload.path, (err,data) => {
                    assert.equal(err,null);
                    newDoc['photo'] = new Buffer.from(data).toString('base64');
                    db.collection('restaurant').updateOne(criteria, {$set: updateDoc},(err,results) => {
                        assert.equal(err,null);
                        client.close()
                        res.status(200).end()
                    })
                });
            } else {
                db.collection('restaurant').updateOne(criteria, {$set: updateDoc},(err,results) => {
                    assert.equal(err,null);
                    client.close()
                    res.status(200).end()
                })
            }
        })
    } else {
        res.status(500).json({"error": "missing restaurantid"});
    }
})

/*  DELETE
curl -X DELETE localhost:8099/api/booking/BK999
*/
app.delete('/api/restaurant/:restaurant_id', (req,res) => {
    if (req.params.restaurant_id) {
        let criteria = {};
        criteria['restaurant_id'] = req.params.restaurant_id;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            db.collection('restaurant').deleteMany(criteria,(err,results) => {
                assert.equal(err,null)
                client.close()
                res.status(200).end();
            })
        });
    } else {
        res.status(500).json({"error": "missing restaurantid"});       
    }
})
//
// End of Restful
//


app.get('/*', (req,res) => {
    //res.status(404).send(`${req.path} - Unknown request!`);
    res.status(404).render('info', {message: `${req.path} - Unknown request!` });
})

app.listen(app.listen(process.env.PORT || 8099));
