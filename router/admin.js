var express = require('express');
var exe = require("../conn");
var router = express.Router();

function checkLogin(req, res, next) {
    if (req.session && req.session.admin_id) {
        next();
    } else {
        res.redirect('/');
    }
}

// middleware: set user for every request
router.use(async function (req, res, next) {
    try {
        if (req.session && req.session.admin_id) {
            // DB मधून user fetch करा
            let user = await exe(`SELECT * FROM login WHERE admin_id = '${req.session.admin_id}'`);

            if (user.length > 0) {
                req.user = user[0];
                res.locals.user = user[0];
            } else {
                req.user = null;
                res.locals.user = null;
            }
        } else {
            req.user = null;
            res.locals.user = null;
        }
        next();
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// login page

router.get("/", async function (req, res) {
    res.render("admin/login.ejs");
});

router.post("/login", async function (req, res) {
    let d = req.body;
    let sql = `SELECT * FROM login WHERE admin_email='${d.admin_email}' AND  admin_password ='${d.admin_password}' `;
    let result = await exe(sql);
    if (result.length > 0) {
        req.session.admin_id = result[0].admin_id;
        res.redirect("/home");
    } else {
        res.redirect("/");
    }


});

router.get('/logout', checkLogin, function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.log("Error destroying session:", err);
            return res.send("Error logging out.");
        }

        res.redirect('/');
    });
});

// dashbord
router.get("/home", checkLogin, async function (req, res) {
    try {

        const [user] = await exe("SELECT * FROM login WHERE admin_id = ?", [req.session.admin_id]);
        const [presentEmp = { total: 0 }] = await exe(
            "SELECT COUNT(*) AS total FROM employees WHERE status='active'"
        );
        const [totalSites = { total: 0 }] = await exe(
            "SELECT COUNT(*) AS total FROM site WHERE status='active'"
        );
        const [totalCust = { total: 0 }] = await exe(
            "SELECT COUNT(*) AS total FROM customers"
        );

        const bankAccounts = await exe("SELECT * FROM bank_accounts");
        const [totalBalance = { sum: 0 }] = await exe(
            "SELECT IFNULL(SUM(current_balance),0) AS sum FROM bank_accounts"
        );


        const paymentData = await exe("SELECT * FROM payment_received");
        const [totalAmount = { total: 0 }] = await exe(
            "SELECT IFNULL(SUM(grand_total),0) AS total FROM payment_received"
        );
        const [receivedAmount = { total: 0 }] = await exe(
            "SELECT IFNULL(SUM(received_amount),0) AS total FROM payment_received"
        );
        const [pendingAmount = { total: 0 }] = await exe(
            "SELECT IFNULL(SUM(new_due_amount),0) AS total FROM payment_received"
        );

        // Inside your /home route
        const [availableFlats = { total: 0 }] = await exe(
            "SELECT COUNT(*) AS total FROM flats WHERE type='Sell' AND buy='Available'"
        );
        const [soldFlats = { total: 0 }] = await exe(
            "SELECT COUNT(*) AS total FROM flats WHERE type='Sell' AND buy='Sell'"
        );
        const [rentedFlats = { total: 0 }] = await exe(
            "SELECT COUNT(*) AS total FROM flats WHERE type='Rent' AND buy='Available'"
        );

        // Inside /home route
        const enquiryAlerts = await exe(
            "SELECT * FROM enquiries WHERE reminder_date <= CURDATE() ORDER BY reminder_date ASC"
        );


        // ✅ Render dashboard
        res.render("admin/home.ejs", {
            user,
            presentEmp: presentEmp.total,
            totalSites: totalSites.total,
            totalCust: totalCust.total,
            bankAccounts,
            totalBalance: totalBalance.sum,
            paymentData,
            totalAmount: Number(totalAmount.total),
            receivedAmount: Number(receivedAmount.total),
            pendingAmount: Number(pendingAmount.total),
            availableFlats: availableFlats.total,
            soldFlats: soldFlats.total,
            rentedFlats: rentedFlats.total,
            enquiryAlerts
        });

    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).send("Error loading dashboard");
    }
});

// profile
router.get("/profile", async function (req, res) {
    const result = await exe(`SELECT * FROM login WHERE admin_id = '${req.session.admin_id}'`);
    res.render("admin/profile.ejs", { admin: result[0], "user": result[0] });
});
router.post("/save_profile", async (req, res) => {
    let d = req.body;

    if (req.files && req.files.admin_image) {
        var admin_image = new Date().getTime() + req.files.admin_image.name;
        req.files.admin_image.mv("public/image/" + admin_image);
        var sql = `UPDATE login SET admin_image = '${admin_image}'WHERE admin_id = '${d.admin_id}'`
        var data = await exe(sql);
    }


    var sql = ` UPDATE login SET
        admin_name = ?,  admin_mobile = ?, admin_email = ?,
        admin_password = ?
      WHERE admin_id = '${d.admin_id}'`;
    var data = await exe(sql, [d.admin_name, d.admin_mobile, d.admin_email, d.admin_password, admin_image]);
    //   res.send(data)
    res.redirect("/profile")
});

// Site Management
router.get("/addsite", async function (req, res) {
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
    res.render("admin/site_list.ejs", { site: result, });
});
router.get('/view_site/:id', async function (req, res) {
    var sql = `SELECT * FROM site WHERE site_id = '${req.params.id}'`
    var sites = await exe(sql)
    var result = await exe(`SELECT * FROM site_contact `)//WHERE site_id = ${req.params.id}
    var camera = await exe(`SELECT * FROM camera`)
    res.render('admin/view_site.ejs', { sites, result, camera })
})
router.get('/edit_site/:id', async function (req, res) {
    var sql = `SELECT * FROM site WHERE site_id = '${req.params.id}'`
    var result = await exe(sql)
    res.render('admin/edit_site.ejs', { 'site': result[0] })
})
router.post("/update_site/:id", async function (req, res) {
    try {
        var d = req.body;
        var { id } = req.params;

        let filename = d.old_structure_image || "";
        let filename1 = d.old_3d_image || "";

        // जर नवीन फाइल आली तर ती save कर
        if (req.files) {
            if (req.files.site_structure_image) {
                filename = new Date().getTime() + req.files.site_structure_image.name;
                req.files.site_structure_image.mv("public/image/site_image/" + filename);
            }

            if (req.files.site_3d_image) {
                filename1 = new Date().getTime() + req.files.site_3d_image.name;
                req.files.site_3d_image.mv("public/image/site_image/" + filename1);
            }
        }

        var sql = `UPDATE site SET site_name=?, site_location=?, site_manager_name=?, site_structure_image=?, site_3d_image=?, site_start_date=?, site_description=?, site_map_link=? WHERE site_id=?`;

        await exe(sql, [
            d.site_name,
            d.site_location,
            d.site_manager_name,
            filename,
            filename1,
            d.site_start_date,
            d.site_description,
            d.site_map_link,
            id
        ]);

        res.redirect("/site_list"); // update झाल्यावर list page वर redirect कर
    } catch (err) {
        console.log(err);
        res.status(500).send("Error updating site");
    }
});

// site Contact

router.post('/save_contact/:id', async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO site_contact(site_id,contact_name,contact_number,contact_address)VALUES(?,?,?,?)`
    var result = await exe(sql, [req.params.id, d.contact_name, d.contact_number, d.contact_address])
    res.redirect(`/view_site/${req.params.id}`)
})
router.get('/delete_contact/:id/:site_id', async function (req, res) {
    var sql = await exe(`DELETE from site_contact WHERE contact_id = '${req.params.id}'`)
    res.redirect(`/view_site/${req.params.site_id}`)
})


// camera site_link
router.post('/save_camera/:id', async function (req, res) {
    var d = req.body
    var sql = `INSERT INTO camera (site_id, camera_name, camera_ip, camera_link,camera_password) VALUES (?,?,?,?,?)`
    var result = await exe(sql, [req.params.id, d.camera_name, d.username, d.camera_link, d.password])
    res.redirect(`/view_site/${req.params.id}`)
})
router.get('/delete_camera/:id/:site_id', async function (req, res) {
    var sql = await exe(`DELETE from camera WHERE camera_id = '${req.params.id}'`)
    res.redirect(`/view_site/${req.params.site_id}`)
})

// Flat Management
router.get("/add_flat", async function (req, res) {

    res.render("admin/add_flat.ejs", {});
})
router.get('/add_new_selling_flat', async function (req, res) {

    var sql = "SELECT * FROM site WHERE status='Active'";
    var site = await exe(sql);
    res.render('admin/add_flat.ejs', { site: site, });
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
router.get('/flat_list', async function (req, res) {
    var sql = `SELECT * FROM flats INNER JOIN site ON flats.site_id = site.site_id WHERE flats.buy='Available'`;
    var flat = await exe(sql);
    res.render('admin/flat_list.ejs', { flat, });
})
router.get('/edit_flat/:id', async function (req, res) {
    var result = await exe(`SELECT * FROM flats WHERE flat_id = ${req.params.id}`)
    console.log(result)
    res.render('admin/edit_flat.ejs', { "flat": result[0] })
})
router.post('/update_flat/:id', async function (req, res) {
    var d = req.body;
    var filename = ""
    if (req.files) {
        var filename = new Date().getTime() + req.files.flat_image.name;
        req.files.flat_image.mv('public/image/flat/' + filename)
    }
    var sql = `UPDATE flats  SET flat_name = ?, carpet = ?, buildup = ?, description = ?, type = ?, flat_image = ?
        WHERE flat_id = ?`;
    var result = await exe(sql, [d.flat_name, d.carpet, d.buildup, d.description, d.type, filename, req.params.id]);
    //   res.send(result)
    res.redirect(`/view_flat/${req.params.id}`)
})


// Rent Management
router.get('/add_rent_flat', async function (req, res) {

    var sql = `SELECT * FROM flats INNER JOIN site ON flats.site_id = site.site_id WHERE flats.type='Rent' AND flats.buy='Available'`;
    var flat = await exe(sql);
    res.render('admin/rent_flat.ejs', { flat: flat, });
})
router.get('/rent_flat_list', async function (req, res) {

    var sql = `SELECT * FROM flats INNER JOIN site ON flats.site_id = site.site_id WHERE flats.buy ='Sell' AND flats.type ='Rent';`;
    var flat = await exe(sql);
})
router.get('/rent_flat_details/:id', async function (req, res) {
    var id = req.params.id;
    var sql = ` SELECT 
    * 
  FROM flat_sales
  LEFT JOIN flats ON flat_sales.flat_id = flats.flat_id
  LEFT JOIN site ON flats.site_id = site.site_id
  LEFT JOIN customers ON flat_sales.customer_id = customers.id
  WHERE flat_sales.flat_id = ?`
    var result = await exe(sql, [id]);
    console.log(id, result);
    res.render('admin/flat_details.ejs', { result });
})
router.get('/rent_flat_report', async function (req, res) {
    var sql = `SELECT * FROM flat_sales
LEFT JOIN flats 
    ON flat_sales.flat_id = flats.flat_id
LEFT JOIN site ON flats.site_id = site.site_id
LEFT JOIN customers 
    ON flat_sales.customer_id = customers.id`
    var result = await exe(sql)
    res.render('admin/selling_flat_report.ejs', { result })

})
router.get('/sale_flat_bill_details/:id', async function (req, res) {

    var sql = `SELECT * FROM flat_sales WHERE sales_id = '${req.params.id}'`
    var result = await exe(sql)
    res.render('admin/selling_report.ejs', { result, })
})
router.get('/flat_details/:id', async function (req, res) {
    var id = req.params.id
    var sql = `SELECT 
  flat_sales.*,
  flats.*,
  site.*,
  customers.*
FROM flat_sales
LEFT JOIN flats ON flat_sales.flat_id = flats.flat_id
LEFT JOIN site ON flats.site_id = site.site_id
LEFT JOIN customers ON flat_sales.customer_id = customers.id
WHERE flat_sales.flat_id = ?;`
    var result = await exe(sql, [id]);
    console.log("result :-", result, "Sql:-", sql, id)

    res.render('admin/flat_details.ejs', { result });
});



// site flat view
router.get('/view/:id', async function (req, res) {
    var id = req.params.id;
    var sql = "SELECT * FROM flats INNER JOIN site ON flats.site_id=site.site_id WHERE flats.flat_id = ?";
    var employee = await exe("SELECT * FROM employees WHERE status='Active'");
    var sql1 = "SELECT * FROM customers WHERE status='Active'";
    var customer = await exe(sql1);
    var result = await exe(sql, [id]);
    res.render('admin/view_flat.ejs', { customer, result, employee, });
});
router.post('/flat-sold', async function (req, res) {
    var d = req.body;
    var filename = ""
    var filename1 = ""
    if (req.files) {
        var filename = new Date().getTime() + req.files.employee_signature.name;
        req.files.employee_signature.mv('public/image/employee' + filename)

        var filename1 = new Date().getTime() + req.files.customer_signature.name;
        req.files.customer_signature.mv('public/image/employee' + filename1)


    }
    const sql = `INSERT INTO flat_sales ( customer_id,flat_id,sale_date,invoice_no,deadline_date,carpet_sqft,buildup_sqft,sqfeet, rate,basic_amount,note,employee_signature,employee_id,customer_signature,customer_name,stamp_duty_percent,stamp_duty_amount,other_tax_percent,other_tax_amount,gst_percent,gst_amount,cgst_percent,cgst_amount,sgst_percent,sgst_amount,total_amount,discount_percent,discount_amount,grand_total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    var values = await exe(sql, [d.customer_id, req.params.id, d.date, d.invoice_no, d.deadline_date, d.carpet, d.buildup, d.sqfeet, d.rate, d.basic_amount, d.note, filename, d.employee_id, filename1, d.customer_name, d.stamp_duty_percent, d.stamp_duty_amount, d.other_tax_percent, d.other_tax_amount, d.gst_percent, d.gst_amount, d.cgst_percent, d.cgst_amount, d.sgst_percent, d.sgst_amount, d.total_amount, d.discount_percent, d.discount_amount, d.grand_total]);

    var sql1 = "UPDATE flats SET buy='Sell' WHERE flat_id=?";
    var result = await exe(sql1, [req.params.id])
    res.redirect('/')



})
router.get('/delete_flat/:id', async function (req, res) {
    var result = await exe(`DELETE FROM flat_sales WHERE sale_id = ${req.params.id}`)
    var data = await exe(`DELETE FROM flats WHERE flat_id = ${req.params.id}`)
    res.redirect('/flat_list')
})
router.get("/view_flat/:id", async function (req, res) {
    var sql = await exe(`SELECT * FROM flats LEFT JOIN site ON flats.site_id = site.site_id WHERE flats.flat_id  = '${req.params.id}'`)
    var result = await exe(`SELECT * FROM specifications WHERE flat_id = ${req.params.id}`)
    res.render('admin/view_flat_details.ejs', { 'flats': sql, result })
})

// specification
router.post('/save_specification/:id', async function (req, res) {
    var d = req.body;
    var id = req.params.id
    var sql = `INSERT INTO specifications(spec_name,spec_details,flat_id)VALUES(?,?,?)`
    var result = await exe(sql, [d.spc_name, d.spc_details, id])
    res.redirect(`/view_flat/${id}`)
})
router.get('/delete_spec/:id/:flat_id', async function (req, res) {
    var result = await exe(`DELETE FROM specifications WHERE spec_id =${req.params.id}`)
    res.redirect(`/view_flat/${req.params.flat_id}`)
})


// Custmor
router.get("/add_customor", async function (req, res) {
    res.render("admin/add_customer.ejs", {});
});
router.post("/add_customor", async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO customers(full_name,email,mobile,password)VALUES(?,?,?,?)`;
    var result = await exe(sql, [d.full_name, d.email, d.mobile, d.password]);
    console.log(d)
    res.redirect("/add_customor");
});
router.get('/delete_customer/:id', async function (req, res) {
    var result = await exe(`DELETE FROM customers WHERE id = ${req.params.id}`)
    res.redirect('/customor_list')
})
router.get("/edit_customer/:id", async function (req, res) {
    var data = await exe('SELECT * FROM customers WHERE id=?', [req.params.id])
    res.render('admin/edit_custmor.ejs', { 'customer': data[0] })
})
router.post("/edit_customer/:id", async function (req, res) {
    var d = req.body;
    var sql = `UPDATE customers SET full_name=?, email=?, mobile=?, password=? WHERE id=?`;
    var result = await exe(sql, [d.full_name, d.email, d.mobile, d.password, req.params.id]);
    res.redirect('/customor_list')
})
router.get("/customor_list", async function (req, res) {
    var sql = "SELECT * FROM customers WHERE status='Active'";
    var result = await exe(sql);
    console.log(result);
    res.render("admin/customer_list.ejs", { customer: result, });
});


// material
router.get('/add_material', async function (req, res) {

    res.render('admin/add_material.ejs', {});
})
router.get('/order_material', async function (req, res) {

    var sql = "SELECT * FROM materials";
    var sql1 = "SELECT * FROM udm WHERE status='Active'";
    var result1 = await exe(sql1);
    var material = await exe(sql);
    res.render('admin/material_order.ejs', { material, result1, });
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
    res.render('admin/material_stock.ejs', { material, });
})

// master
router.get('/unit', async function (req, res) {

    var sql = "SELECT * FROM udm WHERE status='Active'";
    var udm = await exe(sql);
    res.render("admin/udm.ejs", { udm, });
})
router.post('/save_udm', async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO udm(udm_name,udm_added_name)VALUES(?,?)`;
    var result = await exe(sql, [d.udm_name, d.udm_added_name]);
    res.redirect('/unit',);
});
router.get('/gst_unit', async function (req, res) {

    res.render('admin/gst.ejs', {});
})

// employee
router.get('/employee_list', async function (req, res) {
    var employee = await exe("SELECT * FROM employees ");
    res.render("admin/employees_list.ejs", { "employees": employee });
})
router.get('/add_employee', async function (req, res) {

    var result = await exe("SELECT * FROM employee_types WHERE status='Active'");
    res.render("admin/add_employee.ejs", { result, });
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
    // res.send(d)
});

router.get("/edit_employee/:employee_id", async function (req, res) {
    var employee = await exe("SELECT * FROM employees WHERE employee_id=?", [req.params.employee_id]);
    var result = await exe("SELECT * FROM employee_types WHERE status='Active'");
    res.render("admin/edit_employee.ejs", { employee: employee[0], result });
});

router.get("/delete_employee/:employee_id", async function (req, res) {
    var sql = "DELETE FROM employees WHERE employee_id=?";
    var result = await exe(sql, [req.params.employee_id]);
    res.redirect('/employee_list');
});

router.post("/update_employee/:employee_id", async function (req, res) {
    var d = req.body;
    var filename = "";
    if (req.files) {
        var filename = new Date().getTime() + req.files.employee_photo.name;
        req.files.employee_photo.mv("public/image/employee/" + filename);
    }
    var sql = `UPDATE employees SET employee_name=?, employee_email=?, employee_mobile=?, employee_address=?, employee_photo=?, employee_type_id=?, pan_number=?, aadhar_number=?, employee_password=?, employee_dob=?, employee_position=?, employee_in_time=?, employee_monthly_payment=?, employee_joining_date=? WHERE employee_id=?`;
    var result = await exe(sql, [d.employee_name, d.employee_email, d.employee_mobile, d.employee_address, filename, d.employee_type, d.pan_number, d.aadhar_number, d.employee_password, d.employee_dob, d.employee_position, d.employee_in_time, d.employee_monthly_payment, d.employee_joining_date, req.params.employee_id]);

    res.redirect('/employee_list');
});

// type
router.post('/save_type', async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO employee_types(type_name,type_description)VALUES(?,?)`;
    var result = await exe(sql, [d.type, d.details]);
    res.redirect('/add_employee');
});

// bills
router.get("/new_bill", async function (req, res) {

    res.render("admin/new_bill.ejs", {});
})
// })
// router.post("/save_transaction", async function (req, res) {
//     var d = req.body;


//     var account = await exe("SELECT current_balance FROM bank_accounts WHERE account_id=?", [d.account_id]);
//     var current_balance = parseFloat(account[0].current_balance);

//     var amount = parseFloat(d.transaction_amount);


//     if (d.transaction_type === "Credit") {
//         current_balance += amount;
//     } else if (d.transaction_type === "Debit") {
//         current_balance -= amount;
//     }


//     var sql = `INSERT INTO transactions (account_id, transaction_date, transaction_amount, transaction_type, payment_type, transaction_details)
//                VALUES (?, ?, ?, ?, ?, ?)`;

//     await exe(sql, [d.account_id, d.transaction_date, amount, d.transaction_type, d.payment_type, d.transaction_details]);


//     await exe("UPDATE bank_accounts SET current_balance=? WHERE account_id=?", [current_balance, d.account_id]);

//     res.redirect("/admin/view_account/" + d.account_id);
// });



router.get("/edit_account/:account_id", async function (req, res) {
    var data = await exe("SELECT * FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
    res.render("admin/edit_bank_account.ejs", { "data": data[0] });
});
router.post("/update_account", async function (req, res) {
    var d = req.body;
    var sql = `UPDATE bank_accounts SET bank_name=?,account_holder=?,account_number=?,ifsc_code=?,current_balance=? WHERE account_id=?`;
    var result = await exe(sql, [d.bank_name, d.account_holder, d.account_number, d.ifsc_code, d.current_balance, d.account_id]);
    res.redirect("/admin/bank_accounts");
})
router.get("/delete_account/:account_id", async function (req, res) {
    var result = await exe("DELETE FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
    res.redirect("/admin/bank_accounts");
});

// router.get("/edit_account/:account_id", async function (req, res) {
//     var data = await exe("SELECT * FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
//     res.render("admin/edit_bank_account.ejs", { "data": data[0] });
// });
// router.post("/update_account", async function (req, res) {
//     var d = req.body;
//     var sql = `UPDATE bank_accounts SET bank_name=?,account_holder=?,account_number=?,ifsc_code=?,current_balance=? WHERE account_id=?`;
//     var result = await exe(sql, [d.bank_name, d.account_holder, d.account_number, d.ifsc_code, d.current_balance, d.account_id]);
//     res.redirect("/admin/bank_accounts");
// })
// router.get("/delete_account/:account_id", async function (req, res) {
//     var result = await exe("DELETE FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
//     res.redirect("/admin/bank_accounts");
// });

router.get("/new_bill", function (req, res) {
    res.render("admin/new_bill.ejs");

});
router.post("/save_bill", async function (req, res) {
    try {
        var d = req.body;
        var filename = "";

        if (req.files && req.files.site_image_file) {
            let file = req.files.site_image_file;
            filename = Date.now() + "_" + file.name;
            await file.mv("public/image/site_image/" + filename);
        }

        var sql = `INSERT INTO bills (
              expense_by,
              expense_given_by,
              vendor_name,
              date,
              bill_file,
              employee_signature,
              total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`;   // 7 placeholders

        await exe(sql, [
            d.expense_by,
            d.expense_given_by,
            d.vendor_name,
            d.date,
            d.bill_file,
            d.employee_signature,
            d.total  // जर दिलं नसेल तर 0
        ]);




        res.redirect("/new_bill");
    } catch (err) {
        console.error("Error in /save_bill:", err);
        res.status(500).send("Something went wrong!");
    }
});
router.get("/bill_report", async function (req, res) {

    var sql = `SELECT * FROM bills`;
    var expenses = await exe(sql);
    var obj = { "list": expenses };
    res.render("admin/bill_report.ejs", { expenses, })
    // res.send(obj);

});
router.post("/bill_report", async function (req, res) {
    try {
        var d = req.body;
        var sql = "SELECT * FROM bills WHERE date BETWEEN ? AND ? ORDER BY date DESC";
        var bills = await exe(sql, [d.from_date, d.to_date]);
        var totalAmount = bills.reduce((sum, b) => sum + Number(b.total || 0), 0);

        res.render("expense_list", { expenses: expensesData });

    } catch (err) {
        console.error("Error in /bill_report:", err);
        res.status(500).send("Something went wrong!");
    }
});

// enquiry
router.get("/add_enquiry", async function (req, res) {

    res.render("admin/add_enquiry", {});
});
router.post("/new_enquiry", async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO enquiries(customer_name,customer_mobile,customer_email,customer_address,inquiry_about,inquiry_status,reminder_date,remark,action)VALUES(?,?,?,?,?,?,?,?,?)`;
    var result = await exe(sql, [d.customer_name, d.customer_mobile, d.customer_email, d.customer_address, d.inquiry_about, d.inquiry_status, d.reminder_date, d.remark, d.action]);
    res.redirect("/add_enquiry");
});
router.get('/new_enquiry', async function (req, res) {

    var enquiry = await exe("SELECT * FROM enquiries WHERE inquiry_status='new'");
    res.render("admin/new_enquiry.ejs", { "enquiry": enquiry, });
    // res.send({"enquiry":enquiry});
});
router.get("/delete_new/:id", async (req, res) => {

    var id = req.params.id;
    var sql = `DELETE  FROM enquiries WHERE id = ?`;
    var data = await exe(sql, [id]);
    // res.send("delete successfull")
    res.redirect("/admin/new_enquiries");
});
router.get("/processing_inquiries", async function (req, res) {
    var enquiry = await exe("SELECT * FROM enquiries WHERE inquiry_status='processing'");
    res.render("admin/processing_inquiries", { "enquiry": enquiry });
    // res.send({"enquiry":enquiry});
});
router.get("/delete_processing/:id", async (req, res) => {
    var id = req.params.id;
    var sql = `DELETE  FROM enquiries WHERE id = ?`;
    var data = await exe(sql, [id]);
    // res.send("delete successfull")
    res.redirect("/admin/processing_enquiries");
});
router.get("/closed_inquiries", async function (req, res) {

    var enquiry = await exe("SELECT * FROM enquiries WHERE inquiry_status='closed'");
    res.render("admin/closed_inquiries", { "enquiry": enquiry, });
    // res.send({"enquiry":enquiry});
});
router.get("/delete_closed/:id", async (req, res) => {
    var id = req.params.id;
    var sql = `DELETE  FROM enquiries WHERE id = ?`;
    var data = await exe(sql, [id]);
    // res.send("delete successfull")
    res.redirect("/admin/closed_enquiries");
});
router.get("/confirm_enquiries", async function (req, res) {

    var enquiry = await exe("SELECT * FROM enquiries WHERE inquiry_status='confirmed'");
    res.render("admin/confirm_enquiries", { "enquiry": enquiry, });
    // res.send({"enquiry":enquiry});
})
router.get("/delete_confirm/:id", async (req, res) => {
    var id = req.params.id;
    var sql = `DELETE  FROM enquiries WHERE id = ?`;
    var data = await exe(sql, [id]);
    // res.send("delete successfull")
    res.redirect("/admin/confirm_enquiries");
});
router.get('/processing_inquiries', async function (req, res) {

    var enquiry = await exe("SELECT * FROM enquiries WHERE inquiry_status='processing'");
    res.render("admin/processing_inquiries.ejs", { "enquiry": enquiry, });
    // res.send({"enquiry":enquiry});
});
router.get("/delete_processing/:id", async (req, res) => {
    var id = req.params.id;
    var sql = `DELETE  FROM enquiries WHERE id = ?`;
    var data = await exe(sql, [id]);
    // res.send("delete successfull")
    res.redirect("/admin/processing_enquiries");
});

// stock
router.get("/issue_stock", async function (req, res) {

    res.render("admin/issue_stock", {});
});
router.get("/issue_report", async function (req, res) {

    res.render("admin/issue_report", {});
});
router.get("/sale_stock", async function (req, res) {

    res.render("admin/sale_stock", {});
});
router.get("/sale_report", async function (req, res) {

    res.render("admin/sale_report", {});
});


// bank account
router.get("/bank_accounts", async function (req, res) {

    var account = await exe("SELECT * FROM bank_accounts");
    var obj = { "account": account, }
    res.render("admin/bank_accounts_list.ejs", obj);
})
router.get("/add_account", async function (req, res) {

    res.render("admin/add_bank_account.ejs", {});
});
router.post("/save_account", async function (req, res) {
    var d = req.body;
    var sql = `INSERT INTO bank_accounts(bank_name,account_holder,account_number,ifsc_code,current_balance)VALUES(?,?,?,?,?)`;
    var result = await exe(sql, [d.bank_name, d.account_holder, d.account_number, d.ifsc_code, d.current_balance]);
    res.redirect("/bank_accounts");


})
router.get("/view_account/:account_id", async function (req, res) {

    var data = await exe("SELECT * FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
    var result = await exe("SELECT * FROM transactions WHERE account_id=? ORDER BY transaction_id DESC LIMIT 10", [req.params.account_id]);

    res.render("admin/view_bank_account.ejs", { "result": result, "data": data, });
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

    res.redirect("/view_account/" + d.account_id);
});



router.get("/edit_account/:account_id", async function (req, res) {

    var data = await exe("SELECT * FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
    res.render("admin/edit_bank_account.ejs", { "data": data[0], });
});
router.post("/update_account", async function (req, res) {
    var d = req.body;
    var sql = `UPDATE bank_accounts SET bank_name=?,account_holder=?,account_number=?,ifsc_code=?,current_balance=? WHERE account_id=?`;
    var result = await exe(sql, [d.bank_name, d.account_holder, d.account_number, d.ifsc_code, d.current_balance, d.account_id]);
    res.redirect("/bank_accounts");
})
router.get("/delete_account/:account_id", async function (req, res) {
    var result = await exe("DELETE FROM bank_accounts WHERE account_id=?", [req.params.account_id]);
    res.redirect("/bank_accounts");
});


// contractor
router.get("/contractor", async function (req, res) {

    var contractors = await exe("SELECT * FROM contractors");
    res.render("admin/contractors_list.ejs", { "contractors": contractors, });
});
router.post("/save_contractor", async function (req, res) {
    var d = req.body;

    var filename = "";
    if (req.files && req.files.contractor_image) {
        var filename = new Date().getTime() + req.files.contractor_image.name;
        req.files.contractor_image.mv("public/image/" + filename);
    }

    var sql = `INSERT INTO contractors(contractor_name,contractor_address,contractor_details,contractor_mobile,contractor_aadhar,contractor_pan,contractor_type,contractor_image)VALUES(?,?,?,?,?,?,?,?)`;
    var result = await exe(sql, [d.contractor_name, d.contractor_address, d.contractor_details, d.contractor_mobile, d.contractor_aadhar, d.contractor_pan, d.contractor_type, filename]);
    res.redirect("/contractor");
});
router.get("/contracts/:contractor_id", async function (req, res) {

    var contractor = await exe("SELECT * FROM contractors WHERE contractor_id=?", [req.params.contractor_id]);
    var payment2 = await exe("SELECT * FROM payments WHERE contractor_id=?", [req.params.contractor_id]);
    var contracts = await exe("SELECT * FROM contracts WHERE contractor_id=?", [req.params.contractor_id]);
    // last payment for pending/next due
    var lastPayment = await exe(
        "SELECT * FROM payments WHERE contractor_id=? ORDER BY payment_id DESC LIMIT 1",
        [req.params.contractor_id]);


    // total paid
    var totalPaidRes = await exe("SELECT IFNULL(SUM(paid_amount),0) AS total_paid FROM payments WHERE contractor_id=?", [req.params.contractor_id]);
    var totalPaid = totalPaidRes[0].total_paid || 0;

    var pendingToPay = lastPayment.length > 0 ? lastPayment[0].next_due_amount : 0;
    var nextDueAmount = pendingToPay;

    res.render("admin/contractor_details.ejs", { contractor: contractor[0], payment: { paid_amount: totalPaid, pending_to_pay: pendingToPay, next_due_amount: nextDueAmount }, "payment2": payment2, "contracts": contracts, });

});
router.get("/edit_contractor/:contractor_id", async function (req, res) {

    var contractor = await exe("SELECT * FROM contractors WHERE contractor_id=?", [req.params.contractor_id]);
    res.render("admin/edit_contractor.ejs", { "contractor": contractor[0], });
});
router.get("/edit_contractor/:contractor_id", async function (req, res) {
    var contractor = await exe("SELECT * FROM contractors WHERE contractor_id=?", [req.params.contractor_id]);
    res.render("admin/edit_contractor.ejs", { "contractor": contractor[0] });
});
router.post("/update_contractor", async function (req, res) {
    var d = req.body;
    var filename = d.existing_image;
    if (req.files && req.files.contractor_image) {
        filename = new Date().getTime() + req.files.contractor_image.name;
        req.files.contractor_image.mv("public/image/" + filename);
    }

    var sql = `UPDATE contractors SET contractor_name=?, contractor_address=?, contractor_details=?, contractor_mobile=?, contractor_aadhar=?, contractor_pan=?, contractor_type=?, contractor_image=? WHERE contractor_id=?`;
    var result = await exe(sql, [d.contractor_name, d.contractor_address, d.contractor_details, d.contractor_mobile, d.contractor_aadhar, d.contractor_pan, d.contractor_type, filename, d.contractor_id]);
    res.redirect("/contractor");
});
router.get("/delete_contractor/:contractor_id", async function (req, res) {
    var result = await exe("DELETE FROM contractors WHERE contractor_id=?", [req.params.contractor_id]);
    res.redirect("/contractor");
});
router.get("/pay_new_contract/:contractor_id", async function (req, res) {

    var contractor = await exe("SELECT * FROM contractors WHERE contractor_id=?", [req.params.contractor_id]);

    // last payment for pending/next due
    var lastPayment = await exe(
        "SELECT * FROM payments WHERE contractor_id=? ORDER BY payment_id DESC LIMIT 1",
        [req.params.contractor_id]
    );


    // total paid
    var totalPaidRes = await exe("SELECT IFNULL(SUM(paid_amount),0) AS total_paid FROM payments WHERE contractor_id=?", [req.params.contractor_id]);
    var totalPaid = totalPaidRes[0].total_paid || 0;

    var pendingToPay = lastPayment.length > 0 ? lastPayment[0].next_due_amount : 0;
    var nextDueAmount = pendingToPay;

    res.render("admin/pay_new_contract.ejs", {
        contractor: contractor[0],
        payment: {
            paid_amount: totalPaid,
            pending_to_pay: pendingToPay,
            next_due_amount: nextDueAmount
        },

    });
});
router.get("/add_contract/:contractor_id", async function (req, res) {

    var contractor = await exe("SELECT * FROM contractors WHERE contractor_id=?", [req.params.contractor_id]);
    res.render("admin/add_contract.ejs", { contractor: contractor[0], });
});
router.post("/save_contract", async function (req, res) {
    let d = req.body;

    var sql = `INSERT INTO contracts 
    (contractor_id, contract_name, contract_start_date, contract_end_date, contract_amount,
     cgst_per, cgst_amount, sgst_per, sgst_amount, other_tax_per, other_tax_amount, total_amount, contract_details) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await exe(sql, [
        d.contractor_id,
        d.contract_name,
        d.contract_start_date,
        d.contract_end_date,
        d.contract_amount,
        d.cgst_per,
        d.cgst_amount,
        d.sgst_per,
        d.sgst_amount,
        d.other_tax_per,
        d.other_tax_amount,
        d.total_amount,
        d.contract_details
    ]);

    res.redirect("/add_contract/" + d.contractor_id);
});
router.post("/save_payment", async function (req, res) {
    let d = req.body;
    const contractorId = d.contractor_id;


    let lastPendingRes = await exe("SELECT IFNULL(MAX(next_due_amount),0) AS last_pending FROM payments WHERE contractor_id=?", [contractorId]);
    let lastPending = lastPendingRes[0].last_pending || 0;

    let paid = parseFloat(d.paid_amount) || 0;
    let nextDue = Math.max(0, lastPending - paid);  // pending reduce after payment


    let sql = `INSERT INTO payments 
        (contractor_id, pending_to_pay, paid_date, paid_by, transaction_number, bank_name, paid_amount, next_due_amount) 
        VALUES (?,?,?,?,?,?,?,?)`;

    await exe(sql, [
        contractorId,
        lastPending,
        d.paid_date,
        d.paid_by,
        d.transaction_number,
        d.bank_name,
        paid,
        nextDue
    ]);

    res.redirect("/pay_new_contract/" + contractorId);
});

// labours
router.get("/labours/:contractor_id", async function (req, res) {

    var contractor = await exe("SELECT * FROM contractors WHERE contractor_id=?", [req.params.contractor_id]);
    var labours = await exe("SELECT * FROM labours WHERE contractor_id=?", [req.params.contractor_id]);
    res.render("admin/labour_list.ejs", { contractor: contractor[0], "labours": labours, });
});
router.post("/add_labour", async function (req, res) {
    var d = req.body;
    var filename = "";
    if (req.files && req.files.labour_photo) {
        filename = new Date().getTime() + req.files.labour_photo.name;
        req.files.labour_photo.mv("public/image/" + filename);
    }
    var sql = `INSERT INTO labours(contractor_id,labour_name,labour_address,joining_date,labour_mobile,aadhar_card,pan_card,daily_payments,other_details,labour_photo)VALUES(?,?,?,?,?,?,?,?,?,?)`;
    var result = await exe(sql, [d.contractor_id, d.labour_name, d.labour_address, d.joining_date, d.labour_mobile, d.aadhar_card, d.pan_card, d.daily_payments, d.other_details, filename]);
    res.redirect("/labours/" + d.contractor_id);
});
router.get("/delete_labour/:labour_id", async function (req, res) {
    var id = req.params.labour_id;


    var rows = await exe("SELECT contractor_id FROM labours WHERE labour_id=?", [id]);
    var contractorId = rows.length ? rows[0].contractor_id : null;

    await exe("DELETE FROM labours WHERE labour_id=?", [id]);


    res.redirect("/labours/" + contractorId);

});


// maintance
router.get("/new_maintenance", async function (req, res) {

    var sites = await exe("SELECT * FROM site");

    res.render("admin/new_maintenance.ejs", { sites, flats: [], });
});
router.get("/check_maintenance/:site_id", async function (req, res) {

    let site_id = req.params.site_id;

    var sites = await exe("SELECT * FROM site  ");


    res.render("admin/check_maintenance.ejs", { sites, });
    // var flats = await exe("SELECT * FROM flats WHERE site_id=?", [site_id]);

    // res.render("admin/new_maintenance.ejs", { sites, flats,  });
});
router.get("/pending_maintenance", async function (req, res) {

    // var flats = await exe("SELECT * FROM flats WHERE status='Available'");
    res.render("admin/pending_maintenance.ejs", {});
});
router.get("/completed_maintenance", async function (req, res) {

    res.render("admin/completed_maintenance.ejs", {});
});


// vendor
router.get("/add_vendor", async function (req, res) {
    var vendors = await exe("SELECT * FROM vendors");

    res.render("admin/vendor_list.ejs", { "vendors": vendors, });
});
router.post("/save_vendor", async function (req, res) {
    var d = req.body;
    // console.log(d);
    // res.send("ok");
    var sql = `INSERT INTO vendors(vendor_name,vendor_address,vendor_other_details,vendor_phone,vendor_gst_no,vendor_phone2,vendor_date)VALUES(?,?,?,?,?,?,?)`;
    var result = await exe(sql, [d.vendor_name, d.vendor_address, d.vendor_other_details, d.vendor_phone, d.vendor_gst_no, d.vendor_phone2, d.vendor_date]);

    // var sql = `INSERT INTO vendors(vendor_name,vendor_address,vendor_other_details,vendor_phone,vendor_gst_no,vendor_phone2,vendor_date)VALUES(?,?,?,?,?,?,?)`;
    // var result = await exe(sql, [d.vendor_name, d.vendor_address, d.vendor_other_details, d.vendor_phone, d.vendor_gst_no, d.vendor_phone2, d.vendoe_date]);
    res.redirect("/add_vendor");
});
router.get("/edit_vendor/:vendor_id", async function (req, res) {

    var data = await exe("SELECT * FROM vendors WHERE vendor_id=?", [req.params.vendor_id]);
    res.render("admin/edit_vendoe.ejs", { "data": data[0], });
});
router.get("/delete_vendor/:vendor_id", async function (req, res) {
    var result = await exe("DELETE FROM vendors WHERE vendor_id=?", [req.params.vendor_id]);
    res.redirect("/add_vendor");
});
router.post("/update_vendor", async function (req, res) {
    var d = req.body;
    var sql = `UPDATE vendors SET vendor_name=?,vendor_address=?,vendor_other_details=?,vendor_phone=?,vendor_gst_no=?,vendor_phone2=? WHERE vendor_id=?`;
    var result = await exe(sql, [d.vendor_name, d.vendor_address, d.vendor_other_details, d.vendor_phone, d.vendor_gst_no, d.vendor_phone2, d.vendor_id]);
    res.redirect("/add_vendor");

});

// inquiries
router.get("/pro_inq", async function (req, res) {

    var vendor = await exe("SELECT * FROM vendors");
    // var vendor = await exe("SELECT * FROM vendors WHERE vendor_id=?",[req.params.vendor_id]);
    var employee = await exe("SELECT * FROM employees");
    res.render("admin/Pro_inq.ejs", { "vendor": vendor, "employee": employee, });

});
router.post("/save_inquiries", async function (req, res) {
    try {
        const d = req.body;

        let vendor_id = null, vendor_name = null;
        if (d.vendor_info) [vendor_id, vendor_name] = d.vendor_info.split("|");

        const raw_material = Array.isArray(d["raw_material[]"]) ? d["raw_material[]"] : [d["raw_material[]"]];
        const Material_qyt = Array.isArray(d["Material_qyt[]"]) ? d["Material_qyt[]"] : [d["Material_qyt[]"]];
        const udm = Array.isArray(d["udm[]"]) ? d["udm[]"] : [d["udm[]"]];
        const rate = Array.isArray(d["rate[]"]) ? d["rate[]"] : [d["rate[]"]];
        const discount = Array.isArray(d["discount[]"]) ? d["discount[]"] : [d["discount[]"]];
        const Taxable_value = Array.isArray(d["Taxable_value[]"]) ? d["Taxable_value[]"] : [d["Taxable_value[]"]];
        const gst = Array.isArray(d["gst[]"]) ? d["gst[]"] : [d["gst[]"]];
        const total = Array.isArray(d["total[]"]) ? d["total[]"] : [d["total[]"]];

        for (let i = 0; i < raw_material.length; i++) {
            if (!raw_material[i]) continue;
            await exe(
                `INSERT INTO inquiries 
         (vendor_id, vendor_name, purchase_date, purchase_type, raw_material, Material_qyt, udm, rate, discount, Taxable_value, gst, total, employee_sign, employee_signature) 
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    vendor_id,
                    vendor_name,
                    d.purchase_date,
                    d.purchase_type,
                    raw_material[i],
                    Material_qyt[i] || 0,
                    udm[i] || "",
                    rate[i] || 0,
                    discount[i] || 0,
                    Taxable_value[i] || 0,
                    gst[i] || 0,
                    total[i] || 0,
                    d.employee_sign || "",
                    d.employee_signature || "",
                ]
            );
        }


        res.redirect("/pro_inq");
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
    }
});
router.get("/Processing_inq_list", async function (req, res) {

    var inquiry = await exe("SELECT * FROM inquiries");
    res.render("admin/Processing_inq_list.ejs", { inquiries: inquiry, });
});


// payment 
router.get('/new_payment/:id', async function (req, res) {
    var sql = `SELECT * FROM flat_sales LEFT JOIN flats 
    ON flat_sales.flat_id = flats.flat_id
LEFT JOIN site ON flats.site_id = site.site_id
LEFT JOIN customers 
    ON flat_sales.customer_id = customers.id`
    var result = await exe(sql)
    res.render('admin/new_payment.ejs', { result })
})

router.get('/return_payment/:id', async function (req, res) {
    var sql = `SELECT * FROM flat_sales LEFT JOIN flats 
    ON flat_sales.flat_id = flats.flat_id
LEFT JOIN site ON flats.site_id = site.site_id
LEFT JOIN customers 
    ON flat_sales.customer_id = customers.id`
    var result = await exe(sql)
    res.render('admin/new_payment.ejs', { result })
})
router.post("/save_payment_recvied", async function (req, res) {
    try {
        const d = req.body;

        let filename = "";
        let filename1 = "";

        if (req.files) {
            if (req.files.customer_signature) {
                filename = Date.now() + "_" + req.files.customer_signature.name;
                await req.files.customer_signature.mv("public/image/" + filename);
            }

            if (req.files.employee_signature) {
                filename1 = Date.now() + "_" + req.files.employee_signature.name;
                await req.files.employee_signature.mv("public/image/" + filename1);
            }
        }

        const sql = `INSERT INTO payment_received (customer_id, flat_id, grand_total, description, receipt_no, payment_type, payment_date, received_amount, old_due_amount, new_due_amount, employee_id, customer_signature, employee_signature)VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;

        const values = [
            d.customername,
            d.flat_id,
            d.grand_total,
            d.description,
            d.receiptNo,
            d.paymentType,
            d.payment_date,
            d.receivedAmount,
            0,
            0,
            1,
            filename,
            filename1,
        ];

        const result = await exe(sql, values);
        var data = await exe(`SELECT * FROM flat_sales WHERE flat_id = ${d.flat_id}`)
        var total = Number(data[0].grand_total) - Number(d.receivedAmount); // decrease
        await exe(`UPDATE flat_sales SET paid_amount = ? WHERE flat_id = ?`, [total, d.flat_id]);

        res.redirect(`/new_payment/${d.flat_id}`)
    } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, error: err.message });
    }
});

router.get("/view_bill/:inquiry_id", async function (req, res) {

    const items = await exe("SELECT * FROM inquiries WHERE inquiry_id=?", [req.params.inquiry_id]);

    if (items.length === 0) return res.send("Inquiry not found");

    const inquiry = {
        vendor_id: items[0].vendor_id,
        vendor_name: items[0].vendor_name,
        purchase_date: items[0].purchase_date ? items[0].purchase_date.toISOString().slice(0, 10) : '',
        purchase_type: items[0].purchase_type,
        employee_sign: items[0].employee_sign,
        employee_signature: items[0].employee_signature,
        items: items
    };

    res.render("admin/view_inquiry.ejs", { inquiry, });
});
router.get("/delete_inquiry/:inquiry_id", async function (req, res) {
    var result = await exe("DELETE FROM inquiries WHERE inquiry_id=?", [req.params.inquiry_id]);
    res.redirect("/Processing_inq_list");
});


// purchese material
router.get("/Purchase_raw_material", async function (req, res) {

    var vendor = await exe("SELECT * FROM vendors");
    var employee = await exe("SELECT * FROM employees ");
    res.render("admin/purchase_raw_material.ejs", { "vendor": vendor, "employee": employee, })
});
router.post("/save_new_raw_material", async function (req, res) {
    try {
        const d = req.body;

        // Extract vendor info
        let vendor_id = null, vendor_name = null;
        if (d.vendor_info) [vendor_id, vendor_name] = d.vendor_info.split("|");

        // Ensure all fields are arrays
        const raw_material = Array.isArray(d["raw_material[]"]) ? d["raw_material[]"] : [d["raw_material[]"]];
        const qty = Array.isArray(d["qty[]"]) ? d["qty[]"] : [d["qty[]"]];
        const udm = Array.isArray(d["udm[]"]) ? d["udm[]"] : [d["udm[]"]];
        const rate = Array.isArray(d["rate[]"]) ? d["rate[]"] : [d["rate[]"]];
        const discount = Array.isArray(d["discount[]"]) ? d["discount[]"] : [d["discount[]"]];
        const taxable = Array.isArray(d["taxable[]"]) ? d["taxable[]"] : [d["taxable[]"]];
        const gst = Array.isArray(d["gst[]"]) ? d["gst[]"] : [d["gst[]"]];
        const total = Array.isArray(d["total[]"]) ? d["total[]"] : [d["total[]"]];


        if (req.files && req.files.vendor_sign) {
            var filename1 = new Date().getTime() + "_" + req.files.vendor_sign.name;
            req.files.vendor_sign.mv("public/image/" + filename1);
            // vendorSign = "/image/" + filename;
        }

        // Handle employee_sign file
        // let employeeSign = "";
        if (req.files && req.files.employee_sign) {
            var filename = new Date().getTime() + "_" + req.files.employee_sign.name;
            req.files.employee_sign.mv("public/image/" + filename);
            // employeeSign = "/image/" + filename;
        }
        // Loop through each raw material
        for (let i = 0; i < raw_material.length; i++) {
            if (!raw_material[i]) continue;

            await exe(
                `INSERT INTO raw_material_purchases
            (vendor_id, vendor_name, purchase_date, purchase_type, raw_material, qty, udm, rate, discount, taxable, gst, total, total_amount, extra_charges, grand_total, eway_bill, note, employee_name, vendor_sign, employee_sign)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    vendor_id,
                    vendor_name,
                    d.purchase_date,
                    d.purchase_type,
                    raw_material[i],
                    qty[i] || 0,
                    udm[i] || "",
                    rate[i] || 0,
                    discount[i] || 0,
                    taxable[i] || 0,
                    gst[i] || 0,
                    total[i] || 0,
                    d.total_amount || 0,
                    d.extra_charges || 0,
                    d.grand_total || 0,
                    d.eway_bill || "",
                    d.note || "",
                    d.employee_name || "",
                    filename1,
                    filename
                ]
            );
        }

        res.redirect("/Purchase_raw_material");

    } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
    }
});
router.get("/Purchase_report", async function (req, res) {

    var data = await exe("SELECT * FROM raw_material_purchases")
    res.render("admin/Purchase_report.ejs", { "data": data, })
})
router.get("/delete_purchase/:purchase_id", async function (req, res) {
    var result = await exe("DELETE FROM raw_material_purchases WHERE purchase_id=?", [req.params.purchase_id]);
    res.redirect("/Purchase_report");
});
router.get("/purchase_report_product", async function (req, res) {

    var data = await exe("SELECT * FROM raw_material_purchases")

    res.render("admin/purchase_report_product.ejs", { "data": data, })
});
router.get("/view_purchase_details/:purchase_id", async function (req, res) {

    var data = await exe("SELECT * FROM raw_material_purchases WHERE purchase_id=?", [req.params.purchase_id])

    res.render("admin/view_purchase_details.ejs", { "data": data, })
});
router.get("/view_purchase_bill/:purchase_id", async function (req, res) {

    var vendor = await exe("SELECT * FROM raw_material_purchases WHERE purchase_id=?", [req.params.purchase_id])
    var vendors = await exe("SELECT * FROM vendors ")

    res.render("admin/view_purchase_bill.ejs", { "vendor": vendor, "vendors": vendors, })
})
router.get("/my_balance", async function (req, res) {


    var balance = await exe("SELECT * FROM bank_accounts");

    res.render("admin/my balance.ejs", { "balance": balance, })
});
router.get("/vendor_payment", async function (req, res) {
 var vendor = await exe("SELECT * FROM vendors ")

    res.render("admin/vendor_payment.ejs", { "vendor": vendor })
});



module.exports = router;
