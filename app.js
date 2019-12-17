
const express = require("express");
const app = express();
const ejs = require("ejs");
const unirest = require('unirest');
const bodyparser = require('body-parser');
const mysql = require('mysql');
//const passport = require("passport");
//const GoogleStrategy = require('passport-google-oauth20').Strategy;
//express-session
const session = require('express-session');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';

//Enable sessions
app.use(session({
    secret: 'secret',
    path: '/',
    resave: false,
    saveUninitialized: true,

    //cookie: { secure: false }

}));

//mysql connection
const con = mysql.createConnection({
    host: 'ui0tj7jn8pyv9lp6.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'o46e3qfhvskvhdj9',
    password: 'pf1fzyejvyiwmwt1',
    database: 'zge4m6hnao60jhtu'
});

con.connect((err) => {
    if (err) {
        console.log('failed to connect to database');
    }
    console.log('Connected to database');
});

global.con = con;

app.set("view engine", "ejs");
app.set('views', __dirname + '/views');

app.use(express.static("public")); //access images, css, js

// enable use of body-parser 
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: true
}));

// enable use of express
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

app.use(function(req, res, next) {
    res.locals.loggedin = req.session.loggedin;
    res.locals.username = req.session.username;
    next();
});

// routes

module.exports = {

    logInPage: (req, res) => {
        res.render('login.ejs', {
            title: 'Register'
        });

    },

    RegisterPost: (req, res) =>{
        
        var password = req.body.password;
        var email = req.body.email;

        bcrypt.hash(password, saltRounds, function(err, hash) {

            let query = 'INSERT INTO scheduler_users (password, email) VALUES (?, ?)';
            con.query(query, [hash, email], (error, result, fields)=>{
                if (error){

                    return res.render("login.ejs",{
                        taken: "taken"
                    });

                }
                res.redirect("/login");
            });

        });


    },

    logInPost: (req, res) =>{
        var email = req.body.email;
        var password = req.body.passwordd;

        let query = 'SELECT * FROM scheduler_users WHERE email = ?';
        con.query(query, [email], (err, result, fields) =>{
            if (err){
                return res.render("login.ejs",{
                    wrong: "wrong"
                });
            }
           if (result.length === 0){
               return res.render("login.ejs",{
                   wrong: "wrong"
               });
           }
           else {
               const id = result[0].id;
               const  hash = result[0].password.toString();
               bcrypt.compare(password, hash, function(err, resp) {
                   // resp == true
                   //console.log(resp);
                   if (resp === true){
                       req.session.loggedin = true;
                       req.session.email = email;
                       res.redirect("timeSlots");
                       console.log(id);
                   }
                   else {
                       res.render("register",{
                           wrong: "wrong"
                       });
                   }
               });
           }
        });
    },

    logOut: (req, res)=>{

        req.session.loggedin = false;
        req.session.destroy();
        res.redirect('/');

        console.log('logged out');

    },
    profile: (req, res)=>{
        let email = req.session.email;
        let query = 'SELECT * FROM scheduler_users WHERE email = ?';
        con.query(query, [email], (err, result, fields) =>{
            if (err){
                return res.render("login.ejs",{
                    wrong: "wrong"
                });
            }
            res.render('edit.ejs', {
                userinfo: result
            });
        });
    },

    deleteepost: (req, res)=>{
        let email = req.session.email;

        let query = "DELETE FROM users WHERE username = '" + email + "'";
        con.query(query, (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            req.session.loggedin = false;
            req.session.destroy();
            res.redirect('/');
        });
    },

    edit: (req, res)=>{
        let email = req.session.email;
        let password = req.body.password;
        bcrypt.hash(password, saltRounds, function(err, hash) {

            let query = "UPDATE scheduler_users SET `email` ='" + req.body.email + "', `password` = '" + hash + "' WHERE email = '" + email + "'";
            con.query(query, (err, result) => {
                if (err) {
                    return res.status(500).send(err);
                }
                req.session.loggedin = false;
                req.session.destroy();
                res.redirect('/');
            });

        });
    }

};

//
app.get("/", function(req, res) {
    res.render("index");
});

app.post("/submit", async function(req, res) {

    let results = await getScheduleFromDatabase();

    console.log(results);
    res.send("timeSlots", {
        "results": results
    });
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res){
    let query = 'INSERT INTO scheduler_users (password, email) VALUES (?, ?)';
            con.query(query, [req.body.password, req.body.email], (error, result, fields)=>{
                if (error){

                    return res.render("login.ejs",{
                        taken: "taken"
                    });

                }
                res.render("submit");
            });
});

app.get("/login", function(req, res) {
   res.render("login");
});

app.post("/login", function(req, res) {
    var email = req.body.email;
    var password = req.body.password;

    let query = 'SELECT * FROM scheduler_users WHERE email = ?';
        con.query(query, [email], (err, result, fields) =>{
            if (err){
                return res.render("login.ejs",{
                    wrong: "wrong"
                });
            }
           if (result.length === 0){
               return res.render("login.ejs",{
                   wrong: "wrong"
               });//
           }
           else {
               const id = result[0].id;
               const  hash = result[0].password.toString();
               bcrypt.compare(password, hash, function(err, resp) {
                   // res == true
                   //console.log(resp);
                   if (resp === true){
                       req.session.loggedin = true;
                       req.session.email = email;
                       res.redirect("timeSlots");
                       console.log(id);
                   }
                   else {
                       res.render("register",{
                           wrong: "wrong"
                       });
                   }
               });
           }
        });
    },
);

function getScheduleFromDatabase() {
    return new Promise(function(resolve, reject) {
        con.query(
            `SELECT * FROM scheduler_users;`,
            (error, results, fields) => {
                if (error) throw error;
                // console.log(results);
                resolve(results);
        }); // query
    });
};


// running server
app.listen(process.env.PORT || 3000, process.env.IP, function() {
    console.log("Express server is running...");
});
