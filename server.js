const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
const engines = require("consolidate");
const paypal = require("paypal-rest-sdk");

const app = express();
//create a database connection
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'packaters'
});

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

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/paypal', (req,res) => {
    var create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://192.168.0.173:3000/success",
            "cancel_url": "http://192.168.0.173:3000/cancel"
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
            let method = payment.payer.payment_method;
            let payment_id = payment.id;
            let email = payment.payer.payer_info.email;
            let first_name = payment.payer.payer_info.first_name;
            let last_name = payment.payer.payer_info.last_name;
            let payer_id = payment.payer.payer_info.payer_id;
            let status = payment.payer.status;

            conn.query('INSERT INTO pack_paypal (pack_service_id, pack_customer_id, payment_method, payment_id, email, first_name, last_name, payer_id, status) VALUES(?,?,?,?,?,?,?,?,?)',
            [0 , 0, method, payment_id, email, first_name, last_name, payer_id, status], function(error, results, fields) {
                if(error) throw error;
                else{
                    console.log(results);
                    console.log("Get Payment Response");
                    console.log(JSON.stringify(payment));
                    res.render('success');
                }
            })
        }
    });
});

app.get('/cancel', (req,res) => {
    res.render('cancel');
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

app.post('/api/update/customer', function(req, res) {
    let id = req.body.id;
    let firstname = req.body.firstname;
    let lastname = req.body.lastname;
    let phonenum = req.body.phonenum;
    let addr = req.body.address;
    let username = req.body.username;
    let password = req.body.password;

    conn.query('UPDATE pack_customer SET cust_name = ?, cust_lastname = ? , cust_phonenum = ? , cust_address = ?, username = ?, password=? where id = ?',
    [firstname, lastname,phonenum,addr,username,password,id], function(error, rows, fields) {
        if(error) throw error;
        else{ 
            console.log(rows);
            res.send(rows);
            res.end();
        }
    })
})

app.post('/api/user/user', function(req, res) {
    console.log(req.body);
    let username = req.body.username;
    conn.query('SELECT id, cust_name, cust_lastname, cust_address, username, password FROM pack_customer WHERE username = ?', [username], function(error, rows, fields){
        if(error) throw error;
        else{
            res.send(rows);
            console.log(rows);
            res.end();
        }
    })
})

app.get('/api/retrieve/services', (req, res) => {
    conn.query('SELECT *, pack_service.path_image as service_image, pack_caterer.path_image as cat_image,  pack_service.id as id, pack_caterer.id as cat_id FROM pack_service INNER JOIN pack_caterer on pack_service.pack_caterer_id = pack_caterer.id order by pack_service.id desc', function(error, rows, fields){
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

app.post('/api/retrieve/servicePrice', (req, res) => {
    let id = req.body.id;
    conn.query('SELECT service_price from pack_service where id = ?', [id], function(error, rows, fields){
        if(error) throw error;
        else{
            console.log(rows);
            res.send(rows);
            res.end();
        }
    })
})

app.get('/api/retrieve/menu', (req, res) => {
    conn.query('SELECT * FROM pack_menu', function(error, rows, fields) {
        if(error) throw error;
        else{
            console.log(rows);
            res.send(rows);
            res.end();
        }
    })
})

app.post('/api/retrieve/transactions', (req, res) => {
    let id = req.body.id;
    conn.query('SELECT *, pack_transaction.id as trans_id, pack_transaction.status as statuses, pack_service.path_image AS service_image, pack_caterer.path_image AS cat_image FROM (((pack_transaction INNER JOIN pack_service ON pack_transaction.package_id = pack_service.id) INNER JOIN pack_customer ON pack_transaction.customer_id = pack_customer.id) INNER JOIN pack_caterer ON pack_transaction.pack_caterer_id = pack_caterer.id) WHERE pack_transaction.customer_id = ? order by pack_transaction.id desc',
        [id],
        function(error, rows, fields) {
            if(error) throw error;
            else{
                console.log(rows);
                res.send(rows);
                res.end();
            }
        })
})

app.post('/api/retrieve/reorder', (req, res) => {
    let id = req.body.id;
    conn.query('SELECT * FROM pack_transaction inner JOIN pack_service ON pack_transaction.package_id = pack_service.id WHERE pack_transaction.customer_id = ?',
    [id],
    function(error, rows, fields) {
        if(error) throw error;
        else {
            console.log(rows);
            res.send(rows);
            res.end()
        }
    })
})

app.post('/api/create/transaction', (req, res) => {
    let package_name = req.body.package_name;
    let pack_address = req.body.pack_address;
    let pack_date = req.body.pack_date;
    let pack_time = req.body.pack_time;
    let pack_caterer_id = req.body.pack_caterer_id;
    let customer_id = req.body.customer_id;
    let customer_fname = req.body.customer_fname;
    let customer_lname = req.body.customer_lname
    let package_id = req.body.package_id;
    let price = req.body.price;
    let notification = 1;
    let status = 'pending';

    conn.query(
        'INSERT INTO pack_transaction (package_name, pack_address, pack_date, pack_time, pack_caterer_id, customer_id, customer_fname, customer_lname, package_id, price, notification, status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
        [package_name, pack_address, pack_date, pack_time, pack_caterer_id, customer_id, customer_fname, customer_lname, package_id, price, notification, status],
        function(error, rows, fields) {
            if(error) throw error;
            else{
                res.send(rows);
                console.log(rows);
                res.end();
            }
        }
    )
})

app.put('/api/update/transactions', function(req, res) {
    let pack_date = req.body.pack_date;
    let pack_time = req.body.pack_time;
    let pack_address = req.body.pack_address;
    let id = req.body.id;

    conn.query('UPDATE pack_transaction SET pack_date = ? , pack_time = ?, pack_address = ? WHERE id = ? ',
    [pack_date, pack_time, pack_address,id], 
    function(error, rows, fields) {
        if(error) throw error;
        else {
            console.log(rows);
            res.send(rows)
            res.end();
        }
    })
})

app.put('/api/update/transaction/status', function(req, res) {
    let status = "Cancelled";
    let id = req.body.id;

    conn.query('UPDATE pack_transaction SET status = ? WHERE id = ?',
    [status, id], function(error, rows, fields) {
        if(error) throw error;
        else {
            console.log(rows);
            res.send(rows);
            res.end();
        }
    })
})


app.get('/api/retrieve/caterer', (req, res) => {
    conn.query('select * from pack_caterer', function(error, rows, fields) {
        if(error) throw error;
        else{
            res.send(rows);
            console.log(rows);
            res.end();
        }
    })
})

app.post('/api/retrieve/comment', (req, res) => {
    let id = req.body.id;
    conn.query(
        'SELECT * FROM pack_comment WHERE pack_caterer_id = ? ORDER BY id desc',
        [id],
        function(error, rows, fields) {
            if(error) throw error;
            else{
                res.send(rows);
                console.log(rows);
                res.end();
            }
        }
    )
})

app.post('/api/retrieve/caterer', (req, res) => {
    let id = req.body.id;
    conn.query(
        'SELECT * FROM pack_caterer WHERE id = ?',
        [id],
        function(error, rows, fields) {
            if(error) throw error;
            else{
                res.send(rows);
                console.log(rows);
                res.end();
            }
        }
    )
})

app.post('/api/retrieve/totalComment', (req, res) => {
    let id = req.body.id;
    conn.query(
        'SELECT COUNT(id) AS total FROM pack_comment WHERE pack_caterer_id = ?',
        [id],
        function(error, rows, fields) {
            if(error) throw error;
            else {
                res.send(rows);
                console.log(rows);
                res.send();
            }
        }
    )
})

app.post('/api/retrieve/totalServices', (req, res) => {
    let id = req.body.id;
    conn.query(
        'SELECT COUNT(id) AS totalService FROM pack_service WHERE pack_caterer_id = ?',
        [id],
        function(error, rows, fields){
            if(error) throw error;
            else{
                res.send(rows);
                console.log(rows);
                res.send();
            }
        }
    )
})

app.post('/api/create/comment', (req, res) => {
    console.log(req.body);
    let comment = req.body.comment;
    let pack_customer_name = req.body.pack_customer_name;
    let pack_customer_lname = req.body.pack_customer_lname;
    let pack_caterer_id = req.body.pack_caterer_id;
    let pack_customer_id = req.body.pack_customer_id;
    let notification = 1;
    let soft_delete = 0;
    conn.query('INSERT INTO pack_comment(comment, pack_customer_name, pack_customer_lname, pack_caterer_id, pack_customer_id, notification, soft_delete) VALUES(?,?,?,?,?,?,?)',
        [comment, pack_customer_name, pack_customer_lname, pack_caterer_id, pack_customer_id, notification, soft_delete],
        function(error, rows, fields) {
            if(error) throw error;
            else{ 
                console.log(rows);
                res.send(rows);
                res.end();
            }
        }
    )
})
// app.post('api/update/paypal', (req, res) => {
//     var dataj = {pack_service_id: req.body.pack_service_id, pack_customer_id:req.body.pack_customer_id};
//     var sql = 'UPDATE pack_paypal SET ? where payment_id = ? '
//     conn.query('UPDATE pack_paypal ')
// })