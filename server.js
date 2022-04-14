const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');

const app = express();

app.use(cors());
//parse application/json
app.use(bodyParser.json());

//create a database connection
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'packaters'
});

//connect to database
conn.connect((err) => {
    if(err) throw err;
    console.log('Mysql Connected...');
});

app.listen(3000, () => {
    console.log("Server running successfully on 3000");
});

app.post('/api/user/login', function(req, res){
    console.log(req);
    let username = req.body.username;
    let password = req.body.password;

    if(username && password){
        conn.query('SELECT * FROM pack_customer WHERE username = ? AND password = ?', [username, password], function(error, results, fields){
            if(error) throw error;
            if(results.length > 0){
                res.send(results);
                console.log(results);
            } else{
                res.send('Incorrect Username and/or Password');
            }
            res.end();
        });

    }else{
        res.send('Please enter Username and Password!');
        res.end();
    }
})

app.post('/api/user/registration', function(req, res) {
    console.log(req.body);
    let firstname = req.body.firstname;
    let lastname = req.body.lastname;
    let phonenum = req.body.phonenum;
    let addr = req.body.address;
    let username = req.body.username;
    let password = req.body.password;
    let usertype = 'Customer';
    let status = 1;
    if(firstname && lastname && phonenum && addr && username && password){
        conn.query('INSERT INTO pack_customer (cust_name, cust_lastname, cust_phonenum, cust_address, username, password, user_type, status) VALUES(?,?,?,?,?,?,?,?)',
        [firstname, lastname, phonenum, addr, username, password, usertype, status], function(error, results, fields) {
            if(error) throw error;
            else{
                res.send(results)
                console.log(results);
            }
        })
    }else{
        res.send('Please Input the needed fields');
        res.end();
    }
})

app.get('/api/retrieve/services', (req, res) => {
    conn.query('SELECT *, pack_service.id as id, pack_caterer.id as cat_id FROM pack_service INNER JOIN pack_caterer on pack_service.pack_caterer_id = pack_caterer.id', function(error, rows, fields){
        if(error) console.log(error);
        else{
            console.log(rows);
            res.send(rows);
            res.end();
        }
    })
})

app.post('/api/retrieve/services', (req, res) =>{
    let id = req.body.id;
    console.log(id);
    conn.query('SELECT *, pack_service.id as id, pack_caterer.id as cat_id FROM pack_service INNER JOIN pack_caterer on pack_service.pack_caterer_id = pack_caterer.id WHERE pack_service.id = ?', [id], function(error, rows, fields){
        if(error) console.log(error);
        else{
            console.log(rows);
            res.send(rows);
            res.end();
        }
    })
})