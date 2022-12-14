const mysql = require("../db/connection").con;
const nodemailer = require("nodemailer");
const underscore = require("underscore");
const handlebars = require("handlebars");
const path = require("path");
const fs = require("fs");


const getProjectEmp = ((req, res) => {
    const selQuery = "select P.project_id,P.project_name from `ORDEX-PORTAL`.EMPLOYEE_PROJECT EP, `ORDEX-PORTAL`.PROJECT P, `ORDEX-PORTAL`.EMPLOYEE E WHERE E.emp_id=? AND E.emp_id = EP.emp_id AND EP.project_id = P.project_id;";
    mysql.query(selQuery, [req.query.empid], (err, results) => {
        if (err) {
            console.log(`Error fetching data`);
        } else {
            if (results != "") {
                res.status(200).json(results);
            } else {
                res.status(404).json({ "msg": "Data not found!" });
            }
        }
    })
})

const setTask = ((req, res) => {

    const insQuery = "insert into EOD_TASK(emp_id,project_id,task_title,task_desc,status,worktime,created_at,eod_date) values(?,?,?,?,?,?,?,?)";
    mysql.query(insQuery, [req.body.empId, req.body.projectId, req.body.taskTitle, req.body.taskDesc, req.body.status, req.body.workTime, req.body.createdAt, req.body.eodDate], (err, results) => {
        if (err) {
            console.log("EOD Task insertion failed");
            res.status(500).json({ "msg": "Insertion Failed" });
        } else {
            res.status(200).json({ "msg": "Data inserted Successfully" });
        }
    })
})

const getTaskEmp = ((req, res) => {
    console.log(req.query.empid);
    console.log(req.query.eoddate);
    const selQuery = "SELECT p.project_name,et.task_title, et.task_desc,et.status,et.worktime FROM EOD_TASK et, PROJECT p WHERE Emp_id=? AND Eod_date=? AND et.project_id = p.project_id;";
    mysql.query(selQuery, [req.query.empid, req.query.eoddate], (err, results) => {
        if (err) {
            console.log(`Error fetching data`);
        } else {
            if (results != "") {
                console.log(results)
                res.status(200).json(results)
            } else {
                res.status(404).json({ "msg": "Data not found!" });
            }
        }
    })
})

const setEod = ((req, res) => {
    const selQuery = "SELECT * FROM `ORDEX-PORTAL`.EOD_TASK WHERE emp_id=? AND eod_date=?;";
    mysql.query(selQuery, [req.body.empId, req.body.eoddate], (err, results) => {
        if (err) {
            console.log(`Error fetching data`);
        } else {
            if (results != "") {
                function sumUp(sum, time) {
                    var times = time.split(":");
                    sum.h += +times[0];
                    sum.m += +times[1];
                    sum.s += +times[2];
                    return sum;
                }
                function parseSum(sum) {
                    var totSec = sum.s;
                    var s = totSec % 60;
                    var totMin = sum.m + parseInt(totSec / 60);
                    var m = totMin % 60;
                    var totHour = sum.h + parseInt(totMin / 60);
                    var h = totHour;
                    return `${h}:${m}:${s}`;
                }
                var sum = { h: 0, m: 0, s: 0 };
                results.map((data, index) => {
                    sum = sumUp(sum, data.worktime)
                })
                let timeSum = parseSum(sum)

                const insQuery = "INSERT INTO `ORDEX-PORTAL`.EOD(emp_id, total_work_time, created_at,eod_date) VALUES (?,?,?,?)";
                mysql.query(insQuery, [req.body.empId, timeSum, req.body.createdAt, req.body.eoddate], (err, results) => {
                    if (err) {
                        res.status(500).json({ "msg": "Insertion failed" });
                    } else {

                        const selQry = "SELECT  B.emp_id, (CONCAT(B.emp_fname, '  ', B.emp_lname))  AS 'EMP NAME ' , ET.*,P.project_name AS 'PROJECT NAME' , A.mentor_id AS 'EMPLOYEE MENTOR ID' , EA.* , C.email AS 'MENTOR ID'from EMPLOYEE_PROJECT A JOIN EMPLOYEE C ON A.mentor_id=C.emp_id JOIN EMPLOYEE B ON A.emp_id=B.emp_id JOIN EOD_TASK ET ON ET.emp_id=ET.emp_id JOIN PROJECT P  ON P.project_id=A.project_id JOIN EMPLOYEE_ADDITIONAL_MAIL EA ON A.emp_id=EA.emp_id WHERE A.project_id=ET.project_id and B.emp_id=? AND ET.eod_date=?";


                        mysql.query(selQry, [req.body.empId, req.body.eoddate], (err, result) => {
                            if (err) {
                                res.status(500).json({ "msg": "Email not Sent" });
                            } else {

                                console.log(">>>>");
                                console.log(result);


                                let mentors = [];
                                let cc = [];

                                result.map((elem) => {
                                    mentors.push(elem['MENTOR ID']);
                                    if (elem['mentor1_email'] != null) {
                                        cc.push(elem['mentor1_email']);
                                    }
                                    if (elem['mentor2_email'] != null) {
                                        cc.push(elem['mentor2_email']);
                                    }
                                    if (elem['mentor3_email'] != null) {
                                        cc.push(elem['mentor3_email']);
                                    }
                                })



                                // Sending Email 
                                let transporter = nodemailer.createTransport({
                                    service: 'gmail',
                                    auth: {
                                        user: 'ordextechnology@gmail.com',
                                        pass: 'dzjilbhtlkxoeknl'
                                    }
                                });

                                let eodTbl = underscore.template("<table style='font-family: arial,sans-serif;border-collapse:collapse;width: 100%;'> <tr> <th style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'>Sr.no</th> <th style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'>Project Name</th> <th style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'>Task</th><th style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'>Description</th> <th style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'>Work Time</th> <th style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'>Status</th> </tr> " + "<% _.forEach(obj, function(obj,index) " +
                                    "{ %><tr> <td style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'><%-index+1 %></td> <td style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'><%- obj['PROJECT NAME'] %></td><td style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'><%- obj.task_title %></td> <td style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'><%- obj.task_desc %></td> <td style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'><%- obj.worktime %></td><td style=' border: 1px solid #dddddd;text-align:left;padding: 8px;'><%- obj.status %></td></tr><% }); %>" +
                                    "</table >"
                                )({
                                    obj: result
                                })

                                console.log(eodTbl);


                                // filtering unique emails for to: & cc:
                                const unique = (value, index, self) => {
                                    return self.indexOf(value) === index
                                }

                                const uniqueMentorList = mentors.filter(unique);
                                const uniqueCCList = cc.filter(unique);

                                let mentorsList = uniqueMentorList.toString();
                                let ccList = uniqueCCList.toString();

                                console.log(">>>>mentorlist  ", mentorsList);
                                console.log(">>>cclist ", ccList);


                                let mailOptions = {
                                    from: 'ordextechnology@gmail.com',
                                    to: mentorsList,
                                    cc: ccList,
                                    subject: `EOD of ${result[0]['EMP NAME ']} for ${req.body.eoddate}`,
                                    // text: "here goes the msg"
                                    html: `<p>Hello,</p>
                                    <p>Here in this Mail, I have described today's work Information.</p>
                                    ${eodTbl}`
                                };

                                transporter.sendMail(mailOptions, (err, info) => {
                                    if (err) {
                                        console.log(err);
                                        res.status(500).json({ "msg": "Problem in Submitting EOD" });
                                        // res.status(500).json({ "msg": "Email not Sent" });
                                    }
                                    else {
                                        console.log("Email Sent");
                                        console.log(info.response);
                                        res.status(200).json({ "msg": "EOD submitted Successfully" });

                                        // res.status(200).json({ "msg": "Email sent successfully" });
                                    }
                                })
                            }

                        })


                        
                    }
                })
            } else {
                res.status(404).json({ "msg": "Data not found!" });
            }
        }
    })
})



module.exports = { getProjectEmp, getTaskEmp, setEod, setTask };
