const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
const engines = require("consolidate");
const paypal = require("paypal-rest-sdk");

const app = express();

app.use(cors());
app.engine("ejs", engines.ejs);
app.set("views", "./views");
app.set("view engine", "ejs");
//parse application/json
app.use(bodyParser.json());

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AR2W7vYUKaCLGORkiZKcpl3J9A9u4w7sJobOFdgABictfda7YyZgZOAqtrYmbOefo01Wo7QoPe8L3Vkm',
    'client_secret': 'EOSCAMy8NdbJ-9rGHxauIVcfqJEVAf8Heomak3KC5da43TMo8lfISy9Dz-5qUZCjuqK9PilnCRT6XCns'
});


app.get('/paypal', (req,res) => {
    var create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://192.168.0.101:3000/success",
            "cancel_url": "http://192.168.0.101:3000/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "item",
                    "sku": "item",
                    "price": "1.00",
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": "1.00"
            },
            "description": "This is the payment description."
        }]
    };
    
    
    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            console.log("Create Payment Response");
            console.log(payment);
            res.redirect(payment.links[1].href);
        }
    });
});

app.get('/success', (req,res) => {
    // res.send('Success');
    var PayerID = req.query.PayerID;
    var paymentId = req.query.paymentId;

    var execute_payment_json = {
        "payer_id": PayerID,
        "transactions": [{
            "amount": {
                "currency": "USD",
                "total": "1.00"
            }
        }]
    };
    
    
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            console.log("Get Payment Response");
            console.log(JSON.stringify(payment));
            res.render('success');
        }
    });
});

app.get('/cancel', (req,res) => {
    res.render('cancel');
});

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
    conn.query('SELECT *, pack_service.path_image as service_image, pack_caterer.path_image as cat_image,  pack_service.id as id, pack_caterer.id as cat_id FROM pack_service INNER JOIN pack_caterer on pack_service.pack_caterer_id = pack_caterer.id', function(error, rows, fields){
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
    conn.query('SELECT *, pack_service.path_image as service_image, pack_caterer.path_image as cat_image, pack_service.id as id, pack_caterer.id as cat_id FROM pack_service INNER JOIN pack_caterer on pack_service.pack_caterer_id = pack_caterer.id WHERE pack_service.id = ?', [id], function(error, rows, fields){
        if(error) console.log(error);
        else{
            console.log(rows);
            res.send(rows);
            res.end();
        }
    })
})

app.post('/api/retrieve/menu', (req, res) => {
    let id = req.body.id;
    console.log(id);
    conn.query('SELECT *, pack_service.id as id, pack_service.id as service_id FROM `pack_menu` inner join pack_service on pack_menu.pack_service_id = pack_service.id where pack_menu.pack_service_id = ?', [id],
    function(error, rows, fields){
        if(error) throw error;
        else{
            console.log(rows);
            res.send(rows);
            res.end();
        }
    })
})