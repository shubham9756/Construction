var express = require('express');
var exe = require("../conn");
var router = express.Router();

router.get("/", function (req, res) {
    res.render("admin/home.ejs");
});
// Site Management
router.get("/addsite", function (req, res) {
    res.render("admin/addsite.ejs");
});
router.post("/save_site", async function (req, res) {
    var d = req.body;
    var filename = "";
    var filename1 = "";
    if (req.files) {
        var filename = new Date().getTime() + req.files.site_structure_image.name;
        req.files.site_structure_image.mv("public/image/site_image/" + filename);

        var filename1 = new Date().getTime() + req.files.site_3d_image.name;
        req.files.site_3d_image.mv("public/image/site_image/" + filename1);
    }

    var sql = `INSERT INTO site(site_name,site_location,site_manager_name,site_structure_image,site_3d_image,site_start_date,site_description,site_map_link)VALUES(?,?,?,?,?,?,?,?)`;
    var result = await exe(sql, [d.site_name, d.site_location, d.site_manager_name, filename, filename1, d.site_start_date, d.site_description, d.site_map_link]);
    res.redirect("/addsite");
});
router.get("/site_list", async function (req, res) {
    var sql = "SELECT * FROM site WHERE status ='Active'";
    var result = await exe(sql);
    res.render("admin/site_list.ejs", { site: result });
});

// Flat Management
router.get('/add_new_selling_flat', async function (req, res) {
    var sql = "SELECT * FROM site WHERE status='Active'";
    var site = await exe(sql);
    res.render('admin/add_flat.ejs', { site: site });
});
router.post('/save_flat', async function (req, res) {
    var d = req.body;
    var filename = "";
    if (req.files) {
        var filename = new Date().getTime() + req.files.flat_image.name;
        req.files.flat_image.mv("public/image/flat/" + filename);
    }
    var sql = `INSERT INTO flats(flat_name,site_id,flat_image,carpet,buildup,description,type)VALUES(?,?,?,?,?,?,?)`;
    var result = await exe(sql, [d.flat_name, d.site_name, filename, d.carpet, d.buldup, d.description, d.type]);
    res.redirect('/add_new_selling_flat');
});
router.get('/new_selling_flat_list', async function (req, res) {
    var sql = `SELECT * FROM flats INNER JOIN site ON flats.site_id = site.site_id WHERE flats.status='Available'`;
    var flat = await exe(sql);
    res.render('admin/flat_list.ejs', { flat });
})


// Rent Management
router.get('/add_rent_flat', async function (req, res) {
    var sql = `SELECT * FROM flats INNER JOIN site ON flats.site_id = site.site_id WHERE flats.type='Rent' AND flats.buy='Available'`;
    var flat = await exe(sql);
    res.render('admin/rent_flat.ejs', { flat: flat });
})
router.get('/rent_flat_list', async function (req, res) {
    var sql = `SELECT * FROM flats INNER JOIN site ON flats.site_id = site.site_id WHERE flats.buy ='Sell' AND flats.type ='Rent';`;
    var flat = await exe(sql);
    console.log(flat);
    res.render('admin/rent_flat_list.ejs', { flat: flat });
})
// sell management
router.get('/add_selling_flat', async function (req, res) {
    var sql = `SELECT * FROM flats INNER JOIN site ON flats.site_id = site.site_id WHERE flats.type='Sell' AND flats.buy='Available'`;
    var flat = await exe(sql);
    res.render('admin/add_selling_flat.ejs', { flat: flat });
})
router.get('/selling_flat_list', async function (req, res) {
    var sql = `SELECT * FROM flats INNER JOIN site ON flats.site_id = site.site_id WHERE flats.buy = 'Sell' AND flats.type ='Sell'`;
    var flat = await exe(sql);
    res.render('admin/selling_flat_list.ejs', { flat: flat });
})

router.get('/rent_flat_details/:id', async function (req, res) {
    var id = req.params.id;
    var sql = "SELECT * FROM flats WHERE flat_id = ?";
    var site = await exe("SELECT * FROM site WHERE status='Sell'");
    var result = await exe(sql, [id]);
    console.log(result);
    res.render('admin/flat_details.ejs', { result,site });
})


// site flat view
router.get('/view/:id', async function (req, res) {
    var id = req.params.id;
    var sql = "SELECT * FROM flats INNER JOIN site ON flats.site_id=site.site_id WHERE flats.flat_id = ?";
    var employee = await exe("SELECT * FROM employees WHERE status='Active'");

    var sql1 = "SELECT * FROM customers WHERE status='Active'";
    var customer = await exe(sql1);
    var result = await exe(sql, [id]);
    res.render('admin/view_flat.ejs', { customer, result, employee });
});
router.post('/flat-sold', async function (req, res) {
    var d = req.body;

    const sql = `INSERT INTO flat_sales ( customer_id,sale_date,invoice_no,deadline_date,carpet_sqft,buildup_sqft,sqfeet, rate,basic_amount,note,employee_signature,employee_id,customer_signature,customer_name,stamp_duty_percent,stamp_duty_amount,other_tax_persent,other_tax_amount,gst_percent,gst_amount,cgst_percent,cgst_amount,sgst_percent,sgst_amount,total_amount,discount_percent,discount_amount,grand_total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    var values = await exe(sql, [d.customer_id, d.date, d.invoice_no, d.deadline_date, d.carpet, d.buildup, d.sqfeet, d.rate, d.basic_amount, d.note, d.employee_signature, d.employee_id, d.customer_signature, d.customer_name, d.stamp_duty_percent, d.stamp_duty_amount, d.other_tax_percent, d.other_tax_amount, d.gst_percent, d.gst_amount, d.cgst_percent, d.cgst_amount, d.sgst_percent, d.sgst_amount, d.total_amount, d.discount_percent, d.discount_amount, d.grand_total]);

    var sql1 = "UPDATE flats SET status='Inavailable' WHERE flat_id=?";
    res.redirect('/')



})



router.get("/add_customor", function (req, res) {
    res.render("admin/add_customer.ejs");
});
router.post("/add_customor", async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO customers(full_name,email,mobile,password)VALUES(?,?,?,?)`;
    var result = await exe(sql, [d.full_name, d.email, d.mobile, d.password]);
    res.redirect("/add_customor");
});
router.get("/customor_list", async function (req, res) {
    var sql = "SELECT * FROM customers WHERE status='Active'";
    var result = await exe(sql);
    console.log(result);
    res.render("admin/customer_list.ejs", { customer: result });

        var result = await exe(sql, [
            d.company_name,
            d.product_name,
            d.material_type,   
            d.quantity,
            d.order_date,
            d.delivery_date,
            d.location,
            d.remarks,
            "Pending"   
        ]);
        res.redirect('/admin/godwon_orders');
    
});


router.get('/add_material', function (req, res) {
    res.render('admin/add_material.ejs')
})

router.get('/order_material', async function (req, res) {
    var sql = "SELECT * FROM materials";
    var sql1 = "SELECT * FROM udm WHERE status='Active'";
    var result1 = await exe(sql1);
    var material = await exe(sql);
    res.render('admin/material_order.ejs', { material, result1 });
});
router.post('/save_raw_material', function (req, res) {
    var d = req.body
    var sql = `INSERT INTO raw_material(company_name, raw_material_name, unit_weight, udm, purchase_amount, sale_address, gst_percentage)VALUES (?, ?, ?, ?, ?, ?, ?) `;
    var result = exe(sql, [d.product_name, d.raw_material_name, d.unit_weight, d.udm, d.purchase_amount, d.sale_address, d.gst]);
    res.redirect('/order_material');
});
router.get('/site_order_material', async function (req, res) {
    var sql = "SELECT * FROM raw_material INNER JOIN udm ON raw_material.udm = udm.udm_id";
    var material = await exe(sql);
    console.log(material);
    res.render('admin/material_stock.ejs', { material });
})

router.get('/unit', async function (req, res) {
    var sql = "SELECT * FROM udm WHERE status='Active'";
    var udm = await exe(sql);
    res.render("admin/udm.ejs", { udm });
})
router.post('/save_udm', async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO udm(udm_name,udm_added_name)VALUES(?,?)`;
    var result = await exe(sql, [d.udm_name, d.udm_added_name]);
    res.redirect('/unit',);
});
router.get('/gst_unit',function(req,res){
    res.render('admin/gst.ejs')
})
router.get('/employee_list', function (req, res) {
    res.render("admin/contractor_list.ejs");
})

router.get('/add_employee', async function (req, res) {
    var result = await exe("SELECT * FROM employee_types WHERE status='Active'");
    res.render("admin/add_employee.ejs", { result });
});
router.post('/save_type', async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO employee_types(type_name,type_description)VALUES(?,?)`;
    var result = await exe(sql, [d.type, d.details]);
    res.redirect('/add_employee');
});
router.post('/save_employee', async function (req, res) {
    var d = req.body;
    var filename = "";
    if (req.files) {
        var filename = new Date().getTime() + req.files.employee_photo.name;
        req.files.employee_photo.mv("public/image/employee/" + filename);
    }
    var sql = `INSERT INTO employees(employee_name,employee_email,employee_mobile,employee_address,employee_photo,employee_type_id,pan_number,aadhar_number,employee_password,employee_dob,employee_position,employee_in_time,employee_monthly_payment,employee_joining_date)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    var result = await exe(sql, [d.employee_name, d.employee_email, d.employee_mobile, d.employee_address, filename, d.employee_type, d.pan_number, d.aadhar_number, d.employee_password, d.employee_dob, d.employee_position, d.employee_in_time, d.employee_monthly_payment, d.employee_joining_date]);

    res.redirect('/add_employee');
});

router.get("/add_flat",function(req,res){
    res.render("admin/add_flat.ejs");   
})
router.get("/login",function(req,res){
    res.render("admin/login.ejs");   
});

router.get("/bank_accounts",async function(req,res){
    var account = await exe("SELECT * FROM bank_accounts");
    var obj = {"account":account}
    res.render("admin/bank_accounts_list.ejs",obj);   
})

router.get("/add_account",function(req,res){
    res.render("admin/add_bank_account.ejs");   
});
router.post("/save_account",async function(req,res){
    var d = req.body;
    var sql = `INSERT INTO bank_accounts(bank_name,account_holder,account_number,ifsc_code,current_balance)VALUES(?,?,?,?,?)`;
    var result = await exe(sql,[d.bank_name,d.account_holder,d.account_number,d.ifsc_code,d.current_balance]);
    res.redirect("/admin/bank_accounts");
    
    
})
router.get("/view_account/:account_id",async function(req,res){
    var data = await exe("SELECT * FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
   var result = await exe("SELECT * FROM transactions WHERE account_id=? ORDER BY transaction_id DESC LIMIT 10",[req.params.account_id]);

       res.render("admin/view_bank_account.ejs",{"result":result,"data":data});   
})
router.post("/save_transaction", async function (req, res) {
    var d = req.body;

    
    var account = await exe("SELECT current_balance FROM bank_accounts WHERE account_id=?", [d.account_id]);
    var current_balance = parseFloat(account[0].current_balance); 

    var amount = parseFloat(d.transaction_amount); 

    
    if (d.transaction_type === "Credit") {
        current_balance += amount;
    } else if (d.transaction_type === "Debit") {
        current_balance -= amount;
    }

    
    var sql = `INSERT INTO transactions (account_id, transaction_date, transaction_amount, transaction_type, payment_type, transaction_details)
               VALUES (?, ?, ?, ?, ?, ?)`;

    await exe(sql, [d.account_id, d.transaction_date, amount, d.transaction_type, d.payment_type, d.transaction_details]);

    
    await exe("UPDATE bank_accounts SET current_balance=? WHERE account_id=?", [current_balance, d.account_id]);

    res.redirect("/admin/view_account/" + d.account_id);
});


router.get("/edit_account/:account_id",async function(req,res){
    var data = await exe("SELECT * FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
       res.render("admin/edit_bank_account.ejs",{"data":data[0]});   
});
router.post("/update_account",async function(req,res){
    var d = req.body;
    var sql = `UPDATE bank_accounts SET bank_name=?,account_holder=?,account_number=?,ifsc_code=?,current_balance=? WHERE account_id=?`;
    var result = await exe(sql,[d.bank_name,d.account_holder,d.account_number,d.ifsc_code,d.current_balance,d.account_id]);
    res.redirect("/admin/bank_accounts");
})
router.get("/delete_account/:account_id",async function(req,res){
    var result = await exe("DELETE FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
    res.redirect("/admin/bank_accounts");
});

router.get("/add_vendor",async function(req,res){
    var vendor = await exe("SELECT * FROM vendors");
    res.render("admin/vendor_list.ejs",{vendors:vendor});   
});

router.post("/save_vendor",async function(req,res){
    var d = req.body;
    // console.log(d);
    // res.send("ok");
     var sql = `INSERT INTO vendors(vendor_name,vendor_address,vendor_other_details,vendor_phone,vendor_gst_no,vendor_phone2,vendor_date)VALUES(?,?,?,?,?,?,?)`;
    var result = await exe(sql,[d.vendor_name,d.vendor_address,d.vendor_other_details,d.vendor_phone,d.vendor_gst_no,d.vendor_phone2,d.vendoe_date]);
    res.redirect("/admin/vendor_list");
});
router.get("/edit_vendor/:vendor_id",async function(req,res){
    var data = await exe("SELECT * FROM vendors WHERE vendor_id=?", [req.params.vendor_id]);
       res.render("admin/edit_vendoe.ejs",{"data":data[0]});   
});
router.post("/update_vendor",async function (req,res){
    var d = req.body;
    var sql =`UPDATE vendors SET vendor_name=?,vendor_address=?,vendor_other_details=?,vendor_phone=?,vendor_gst_no=?,vendor_phone2=? WHERE vendor_id=?`;
    var result = await exe(sql,[d.vendor_name,d.vendor_address,d.vendor_other_details,d.vendor_phone,d.vendor_gst_no,d.vendor_phone2,d.vendor_id]);
    res.redirect("/admin/add_vendor"); 
    
});
router.get("/PROCESSING_INQUIRIES",async function(req,res){
    var vendor = await exe("SELECT * FROM vendors");
    var vendors = await exe("SELECT * FROM vendors WHERE vendor_id=?",[req.params.vendor_id]);
    res.render("admin/Processing_Inquiries.ejs",{"vendor":vendor,vendors:vendors});
});
router.post("/save_inquiry",async function(req,res){
    var d = req.body;
    
    var sql = `INSERT INTO inquiries(vendor_id,vendor_name,purchase_date,purchase_type,raw_material,Material_qyt,udm,rate,discount,Taxable_value,gst,total,employee_sign,employee_signature,created_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    var result = await exe(sql,[d.vendor_id,d.vendor_name,d.purchase_date,d.purchase_type,d.raw_material,d.Material_qyt,d.udm,d.rate,d.discount,d.Taxable_value,d.gst,d.total,d.employee_sign,d.employee_signature ,d.created_at]);
    res.redirect("/admin/PROCESSING_INQUIRIES");
          console.log("Form data =>", d);
});
router.get("/Processing_inq_list",async function(req,res){
    var inquiry = await exe("SELECT * FROM inquiries");
    res.render("admin/Processing_inq_list.ejs",{inquiries:inquiry});   
});
// router.post("/update_inquiry",async function (req,res){
//     var d = req.body;
//     var sql =`UPDATE inquiries SET vendor_id=?,purchase_date=?,purchase_type=?,row_material=?,Material_qyt=?,udm=?,rate=?,discount=?,Taxable_value=?,gst=?,total=?,employee_signature=? WHERE inquiry_id=?`;
//     var result = await exe(sql,[d.vendor_id,d.purchase_date,d.purchase_type,d.row_material,d.Material_qyt,d.udm,d.rate,d.discount,d.Taxable_value,d.gst,d.total,d.employee_signature,d.inquiry_id]);
//     res.redirect("/admin/Processing_inq_list");
//     });

module.exports = router;
