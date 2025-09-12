var express = require('express');
var exe = require("../conn");
var router = express.Router();

router.get("/", function (req, res) {
    res.render("admin/home.ejs");
});

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
    var sql = `INSERT INTO site(site_name,site_location,site_manager_name,site_structure_image,site_3d_image,site_start_date,total_area_sqft,flats_per_floor,total_floors,total_flats,flat_area_sqft,site_completed_date,site_description)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    var result = await exe(sql, [d.site_name, d.site_location, d.site_manager_name, filename, filename1, d.site_start_date, d.total_area_sqft, d.flats_per_floor, d.total_floors, d.total_flats, d.flat_area_sqft, d.site_completed_date, d.site_description]);


    var sql1 = `INSERT INTO floor(site_id,flat_area_sqft)VALUES(?,?)`;
    for (let i = 1; i <= d.total_floors; i++) {
        var result1 = await exe(sql1, [result.insertId, d.flat_area_sqft]);
    }

    res.redirect("/admin/addsite");

});

router.get("/pending_site", async function (req, res) {
    var sql = `SELECT * FROM site WHERE status ='Pending'`;
    var result = await exe(sql);
    res.render("admin/pending_site.ejs", { data: result });
});

router.get('/godwon_orders',async function (req,res){ 
    res.render("admin/godwon_orders.ejs");
    
})
router.post('/save_godown_order', async function (req, res) {
        var d = req.body;
        var sql = `INSERT INTO godown_orders 
        (company_name, product_name, material_type, quantity, order_date, delivery_date, location, remarks, status) 
        VALUES (?,?,?,?,?,?,?,?,?)`;

        var result = await exe(sql, [
            d.company_name,
            d.product_name,
            d.material_type,   
            d.quantity,
            d.order_date,
            d.delivery_date,
            d.location,
            d.remarks,
            "Pending"   // default status
        ]);
        res.redirect('/admin/godwon_orders');
    
});

router.get('/godwon_stock',async function (req,res){ 
    var sql = `SELECT * FROM godown_orders`;
    var result = await exe(sql);
    res.render("admin/godwon_stock.ejs",{stock:result});   
})  

router.get('/godwon_order_stock',async function (req,res){
    var sql = `SELECT * FROM godown_stock`;
    res.render("admin/godwon_stock.ejs");   
})  


module.exports = router;

