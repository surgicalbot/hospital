var express = require('express'),
  app = express(),
  http = require('http'),
  httpServer = http.Server(app);
var mongodb = require("mongodb");
var bodyParser = require("body-parser");
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var xlsxj = require("xlsx-to-json");
var session = require('express-session');
var cookieparser = require('cookie-parser');
app.use(cookieparser());
app.use(session({ secret: 'srinivasan' }));
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
var upload = multer({ storage: storage }).single('userPhoto');
app.post('/api/photodoc', function (req, res) {
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      return res.end("Error uploading file.");
    }
    var model = null;
    xlsxj({
      input: __dirname + "/uploads/" + req.file.filename,
      output: __dirname + "/uploads/" + "output.json"
    }, function (err, result) {
      if (err) {
        console.error(err);
      } else {
        fs.unlink(path.join(__dirname + "/uploads/" + req.file.filename), function () {
          fs.unlink(path.join(__dirname + "/uploads/output.json"), function () {
            mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
              if (err) {
                console.log(err);
                process.exit(1);
              }
              // Save database object from the callback for reuse.
              db = database;
              db.collection("doctor").insertMany(result, function (err, response) {
                res.json({ file: "uploaded" });
              });
              db.close();
            });
            // setTimeout(() => {
            //   res.redirect("/formupload");
            // }, 2000)
          })
        })
      }
    });

  });
});
app.post('/api/photo', function (req, res) {
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      return res.end("Error uploading file.");
    }
    var model = null;
    xlsxj({
      input: __dirname + "/uploads/" + req.file.filename,
      output: __dirname + "/uploads/" + "output.json"
    }, function (err, result) {
      if (err) {
        console.error(err);
      } else {
        fs.unlink(path.join(__dirname + "/uploads/" + req.file.filename), function () {
          fs.unlink(path.join(__dirname + "/uploads/output.json"), function () {
            console.log(result);
            mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
              if (err) {
                console.log(err);
                process.exit(1);
              }
              // Save database object from the callback for reuse.
              db = database;
              db.collection("surgery").insertMany(result, function (err, response) {
                res.json({ file: "uploaded" });
              });
              db.close();
            });
            // setTimeout(() => {
            //   res.redirect("/formupload");
            // }, 2000)
          })
        })
      }
    });

  });
});
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}
var ObjectID = mongodb.ObjectID;
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.get('/', function (req, res) {
  res.send("/richowebsites");
});
app.post('/', function (req, res) {
  if (!req.body || !req.body.result || !req.body.result.parameters) {
    return res.status(400).send('Bad Request')
  }
  let action = req.body.result.action; // https://dialogflow.com/docs/actions-and-parameters
  console.log(action);
  // Parameters are any entites that Dialogflow has extracted from the request.
  var parameters = req.body.result.contexts.length > 0 ? req.body.result.contexts[0].parameters : req.body.result.parameters;
  if (action == "input.treatment") {
    var treatmentarray = [];
    const treatmentyp = parameters.treatment_type != '' ? parameters.treatment_type : "";
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);
      }
      filterarray = [
        { $or: [{ "TREATMENT": treatmentyp.toLowerCase() }, { "TREATMENT": treatmentyp.toUpperCase() }, { "TREATMENT": capitalizeFirstLetter(treatmentyp) }, { "TREATMENT": toTitleCase(treatmentyp) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err, result) {
        if (result.length > 0) {
          var treatmentarray = [];
          for (var keys in result) {

            if (treatmentarray.indexOf(result[keys]["HOSPITAL"]) < 0) {
              treatmentarray.push(result[keys]["HOSPITAL"]);
            }
          }
          var html = '';
          for (var treatment in treatmentarray) {
            html += " > " + treatmentarray[treatment] + "\n";
          }
          if (html) {
            html += "\nPlease select your operation type?";
            res.status(200).json({
              source: 'webhook',
              speech: html,
              displayText: html
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "I didnt get that",
            displayText: "I didnt get that"
          })
        }
      });
      db.close();
    });
  }
  if (action == "input.next") {
    var finalarray = [];
    var hospitalarray = req.cookies["cookie1"];
    var counter = parseInt(req.cookies["cookie2"]);
    var counterstore = parseInt(req.cookies["cookie2"]) + 8;
    var incrm = 0;
    if (hospitalarray.length > counterstore) {
      var html1 = {};
      html1["title"] = "prev";
      html1["payload"] = "prev";
      html1["content_type"] = "text";
      finalarray.push(html1);
      for (var treatsurgiment in hospitalarray) {
        if (incrm <= counterstore && incrm >= counter) {
          html1 = {};
          html1["title"] = hospitalarray[treatsurgiment];
          html1["payload"] = hospitalarray[treatsurgiment];
          html1["content_type"] = "text";
          finalarray.push(html1);


        }
        incrm++;
      }
      html1 = {};
      html1["title"] = "next";
      html1["payload"] = "next";
      html1["content_type"] = "text";
      finalarray.push(html1);
      res.cookie("cookie2", counterstore, { expire: new Date() + 1 });
      res.json({
        speech: "",
        displayText: "",
        source: 'agent',
        "messages": [
          {
            "type": 4,
            "platform": "facebook",
            "payload": {
              "facebook": {
                "text": "Please Select the Operation List",
                "quick_replies": finalarray
              }
            }
          }
        ]
      })
    }
    else if ((hospitalarray.length - counterstore) <= 10) {
      var html1 = {};
      html1["title"] = "prev";
      html1["payload"] = "prev";
      html1["content_type"] = "text";
      finalarray.push(html1);
      for (var treatsurgiment in hospitalarray) {
        if (incrm <= counterstore && incrm >= counter) {
          html1 = {};
          html1["title"] = hospitalarray[treatsurgiment];
          html1["payload"] = hospitalarray[treatsurgiment];
          html1["content_type"] = "text";
          finalarray.push(html1);
        }
        incrm++;
      }
      res.json({
        speech: "",
        displayText: "",
        source: 'agent',
        "messages": [
          {
            "type": 4,
            "platform": "facebook",
            "payload": {
              "facebook": {
                "text": "Please Select the Operation List",
                "quick_replies": finalarray
              }
            }
          }
        ]
      })
    }

  }
  if (action == "input.prev") {
    var finalarray = [];
    var hospitalarray = req.cookies["cookie1"];


    var counter = parseInt(req.cookies["cookie2"]) - 8;
    var counterstore = parseInt(req.cookies["cookie2"]);
    var incrm = 0;

    if (counter > 10) {
      var html1 = {};
      html1["title"] = "prev";
      html1["payload"] = "prev";
      html1["content_type"] = "text";
      finalarray.push(html1);
      for (var treatsurgiment in hospitalarray) {
        if (incrm <= counterstore && incrm >= counter) {
          html1 = {};
          html1["title"] = hospitalarray[treatsurgiment];
          html1["payload"] = hospitalarray[treatsurgiment];
          html1["content_type"] = "text";
          finalarray.push(html1);


        }
        incrm++;
      }
      html1 = {};
      html1["title"] = "next";
      html1["payload"] = "next";
      html1["content_type"] = "text";
      finalarray.push(html1);
      res.cookie("cookie2", counter, { expire: new Date() + 1 });
      res.json({
        speech: "",
        displayText: "",
        source: 'agent',
        "messages": [
          {
            "type": 4,
            "platform": "facebook",
            "payload": {
              "facebook": {
                "text": "Please Select the Operation List",
                "quick_replies": finalarray
              }
            }
          }
        ]
      })

    }
    else if (counter <= 10) {
      var html1 = {};

      for (var treatsurgiment in hospitalarray) {
        if (incrm <= counterstore && incrm >= counter) {
          html1 = {};
          html1["title"] = hospitalarray[treatsurgiment];
          html1["payload"] = hospitalarray[treatsurgiment];
          html1["content_type"] = "text";
          finalarray.push(html1);
        }
        incrm++;
      }
      html1 = {};
      html1["title"] = "next";
      html1["payload"] = "next";
      html1["content_type"] = "text";
      finalarray.push(html1);

      res.json({
        speech: "",
        displayText: "",
        source: 'agent',
        "messages": [
          {
            "type": 4,
            "platform": "facebook",
            "payload": {
              "facebook": {
                "text": "Please Select the Operation List",
                "quick_replies": finalarray
              }
            }
          }
        ]
      })
    }

  }
  if (action == "input.operationlist") {
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);
      }
      db.collection("surgery").find().toArray(function (err1, result1) {
        var hospitalarray = [];
        var finallarray = [];
        for (var keys in result1) {
          if (hospitalarray.indexOf(result1[keys]["Operation"]) < 0) {
            if (result1[keys]["Operation"]) {
              hospitalarray.push(result1[keys]["Operation"]);
            }
          }
        }
        if (hospitalarray.length < 10) {
          for (var treatsurgiment in hospitalarray) {
            var html1 = {};
            html1["title"] = hospitalarray[treatsurgiment];
            html1["payload"] = hospitalarray[treatsurgiment];
            html1["content_type"] = "text";
            finallarray.push(html1);
          }
        }
        if (hospitalarray.length > 10) {
          var incrme = 0;
          for (var treatsurgiment in hospitalarray) {
            var html1 = {};
            if (incrme < 10) {
              html1["title"] = hospitalarray[treatsurgiment];
              html1["payload"] = hospitalarray[treatsurgiment];
              html1["content_type"] = "text";
              finallarray.push(html1);
            } else if (incrme == 10) {
              html1["title"] = "next";
              html1["payload"] = "next";
              html1["content_type"] = "text";
              finallarray.push(html1);
              break;
            }
            incrme++;
          }
        }

        res.cookie("cookie1", hospitalarray, { expire: new Date() + 1 });
        res.cookie("cookie2", incrme, { expire: new Date() + 1 });
        res.json({
          speech: "",
          displayText: "",
          source: 'agent',
          "messages": [
            {
              "type": 4,
              "platform": "facebook",
              "payload": {
                "facebook": {
                  "text": "Please Select the Operation List",
                  "quick_replies": finallarray
                }
              }
            }
          ]
        })
      });
    });
  }
  if (action == "input.hospitallist") {
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);
      }
      db.collection("surgery").find().toArray(function (err1, result1) {
        var hospitalarray = [];
        var finallarray = [];
        for (var keys in result1) {
          if (hospitalarray.indexOf(result1[keys]["HOSPITAL"]) < 0) {
            if (result1[keys]["HOSPITAL"]) {
              hospitalarray.push(result1[keys]["HOSPITAL"]);
            }
          }
        }
        for (var treatsurgiment in hospitalarray) {
          var html1 = {};
          html1["title"] = hospitalarray[treatsurgiment];
          html1["payload"] = hospitalarray[treatsurgiment];
          html1["content_type"] = "text";
          finallarray.push(html1);
        }

        res.json({
          speech: "",
          displayText: "",
          source: 'agent',
          "messages": [
            {
              "type": 4,
              "platform": "facebook",
              "payload": {
                "facebook": {
                  "text": "Please Select the Hospital List",
                  "quick_replies": finallarray
                }
              }
            }
          ]
        })
      });
    });

  }
  if (action == "input.statistics") {
    var hospitalarray = [];
    const hospitaltype = parameters.hospital_type != '' ? parameters.hospital_type : "";
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);

      }
      filterarray = [
        { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err, result) {
        if (result.length > 0) {
          var hospitalarray = [];
          for (var keys in result) {
            console.log(result[keys]["Statistics"]);
            if (hospitalarray.indexOf(result[keys]["Statistics"]) < 0) {
              hospitalarray.push(result[keys]["Statistics"]);
            }
          }
          var finallarray = [];
          for (var treatsurgiment in hospitalarray) {
            var html = {};
            html["title"] = hospitalarray[treatsurgiment];
            html["payload"] = hospitalarray[treatsurgiment];
            html["content_type"] = "text";
            finallarray.push(html);
          }
          if (html) {
            res.json({
              speech: "",
              displayText: "",
              source: 'agent',
              "messages": [
                {
                  "type": 4,
                  "platform": "facebook",
                  "payload": {
                    "facebook": {
                      "text": "Please Choose Statistics?",
                      "quick_replies": finallarray
                    }
                  }
                }
              ]
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "I didnt get that",
            displayText: "I didnt get that"
          })
        }
      });
      db.close();
    });
  }
  if (action == "hospital.operation.options.type") {
    var hospitalarray = [];
    const hospitaltype = parameters.hospital_type != '' ? parameters.hospital_type : "";
    const treatmentyp = parameters.treatment_type != '' ? parameters.treatment_type : "";
    const surgicaltyp = parameters.surgical_type != '' ? parameters.surgical_type : "";
    var totalCost;
    totalCost = (parameters.Statistics != "" && parameters.Statistics != null && parameters.Statistics != undefined) ? parameters.Statistics : "Median";
    if (hospitaltype.toUpperCase() == "UNION HOSPITAL") {
      totalCost = (parameters.Statistics != "" && parameters.Statistics != null && parameters.Statistics != undefined) ? parameters.Statistics : "50th percentile";
    }
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);

      }
      filterarray = [
        { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
        { $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] },
        { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] },
        { $or: [{ "Statistics": totalCost.toLowerCase() }, { "Statistics": totalCost.toUpperCase() }, { "Statistics": capitalizeFirstLetter(totalCost) }, { "Statistics": toTitleCase(totalCost) }] }


      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err1, result1) {
        if (err1) throw err1;
        var html = '';
        if (result1.length > 0) {
          for (var key in result1[0]) {
            if (key != '_id' && key.toLowerCase() != "date" && key != "" && key.toLowerCase() != "website") {
              if (key.toLowerCase() != "operation options" && key.toLowerCase() != "type" && key.toLowerCase() != "operation" && key.toLowerCase() != "orignal description" && key.toLowerCase() != "hospital") {

                html += `${key}: ${result1[0][key]}\n`;
              }
              else {
                html += `${result1[0][key]}\n`;
              }
            }

          }
          if (html) {
            db.collection("surgery").find({
              $and: [{ $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
              { $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] },
              { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] }

              ]
            }).toArray(function (err2, result2) {
              var finallarray = [];
              var hospitalarray = [];
              for (var keys in result2) {
                if (hospitalarray.indexOf(result2[keys]["Statistics"]) < 0) {
                  if (result2[keys]["Statistics"]) {
                    hospitalarray.push(result2[keys]["Statistics"]);
                  }
                }
              }
              for (var treatsurgiment in hospitalarray) {
                var html1 = {};
                html1["title"] = hospitalarray[treatsurgiment];
                html1["payload"] = hospitalarray[treatsurgiment];
                html1["content_type"] = "text";
                finallarray.push(html1);
              }
              html += "\ninterested in min/max/median case instead? or other hospital?";
              res.json({
                speech: "",
                displayText: "",
                source: 'agent',
                "messages": [
                  {
                    "type": 4,
                    "platform": "facebook",
                    "payload": {
                      "facebook": {
                        "text": html,
                        "quick_replies": finallarray
                      }
                    }
                  }
                ]
              })
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "I didnt get that",
            displayText: "I didnt get that"
          })
        }
      });
    })

  }
  if (action == "hospital.operation.options.type.statistics") {

  }
  if (action == "hospital.operation.statistics") {
    var hospitalarray = [];
    const hospitaltype = parameters.hospital_type != '' ? parameters.hospital_type : "";
    const treatmentyp = parameters.treatment_type != '' ? parameters.treatment_type : "";
    const surgicaltyp = parameters.surgical_type != '' ? parameters.surgical_type : "";
    const totalCost = (parameters.Statistics != "" && parameters.Statistics != null && parameters.Statistics != undefined) ? parameters.Statistics : "";
    console.log(hospitaltype + treatmentyp + surgicaltyp + totalCost);
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);

      }
      filterarray = [
        { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
        { $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] },
        { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] },
        { $or: [{ "Statistics": totalCost.toLowerCase() }, { "Statistics": totalCost.toUpperCase() }, { "Statistics": capitalizeFirstLetter(totalCost) }, { "Statistics": toTitleCase(totalCost) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err1, result1) {
        if (err1) throw err1;
        var html = '';
        if (result1.length > 0) {
          for (var key in result1[0]) {
            if (key != '_id' && key.toLowerCase() != "date" && key != "" && key.toLowerCase() != "website") {
              if (key.toLowerCase() != "operation options" && key.toLowerCase() != "type" && key.toLowerCase() != "operation" && key.toLowerCase() != "orignal description" && key.toLowerCase() != "hospital") {
                html += `${key}: ${result1[0][key]}\n`;
              }
              else {
                html += `${result1[0][key]}\n`;
              }
            }
          }
          if (html) {
            db.collection("surgery").find({
              $and: [{ $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
              { $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] },
              { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] }]
            }).toArray(function (err2, result2) {
              var finallarray = [];
              var hospitalarray = [];
              for (var keys in result2) {
                if (hospitalarray.indexOf(result2[keys]["Statistics"]) < 0) {
                  if (result2[keys]["Statistics"]) {
                    hospitalarray.push(result2[keys]["Statistics"]);
                  }
                }
              }
              for (var treatsurgiment in hospitalarray) {
                var html1 = {};
                html1["title"] = hospitalarray[treatsurgiment];
                html1["payload"] = hospitalarray[treatsurgiment];
                html1["content_type"] = "text";
                finallarray.push(html1);
              }
              html += "\ninterested in min/max/median case instead? or other hospital?";
              res.json({
                speech: "",
                displayText: "",
                source: 'agent',
                "messages": [
                  {
                    "type": 4,
                    "platform": "facebook",
                    "payload": {
                      "facebook": {
                        "text": html,
                        "quick_replies": finallarray
                      }
                    }
                  }
                ]
              })
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "I didnt get that",
            displayText: "I didnt get that"
          })
        }
      });
    })
  }
  if (action == "hospital.operation.options") {
    var hospitalarray = [];
    const hospitaltype = parameters.hospital_type != '' ? parameters.hospital_type : "";
    const treatmentyp = parameters.treatment_type != '' ? parameters.treatment_type : "";
    const surgicaltyp = parameters.surgical_type != '' ? parameters.surgical_type : "";
    console.log(parameters);
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);

      }
      filterarray = [
        { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
        { $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] },
        { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err, result) {
        console.log(result);
        if (result.length > 0) {
          var hospitalarray = [];
          for (var keys in result) {
            if (hospitalarray.indexOf(result[keys]["operation Options"]) < 0) {
              if (result[keys]["operation Options"]) {
                hospitalarray.push(result[keys]["operation Options"]);
              }
            }
          }
          var finallarray = [];
          if (hospitalarray.length > 0) {

            for (var treatsurgiment in hospitalarray) {
              var html = {};
              html["title"] = hospitalarray[treatsurgiment];
              html["payload"] = hospitalarray[treatsurgiment];
              html["content_type"] = "text";
              finallarray.push(html);
            }
            console.log();
            if (html) {
              res.json({
                speech: "",
                displayText: "",
                source: 'agent',
                "messages": [
                  {
                    "type": 4,
                    "platform": "facebook",
                    "payload": {
                      "facebook": {
                        "text": "Select the Operation Options",
                        "quick_replies": finallarray
                      }
                    }
                  }
                ]
              })
            }
          }
          else {
            var totalCost;
            totalCost = (parameters.Statistics != "" && parameters.Statistics != null && parameters.Statistics != undefined) ? parameters.Statistics : "Median";
            if (hospitaltype.toUpperCase() == "UNION HOSPITAL") {
              totalCost = (parameters.Statistics != "" && parameters.Statistics != null && parameters.Statistics != undefined) ? parameters.Statistics : "50th percentile";
            }
            mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
              var db = database;
              if (err) {
                console.log(err);

              }
              filterarray = [
                { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
                { $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] },
                { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] },
                { $or: [{ "Statistics": totalCost.toLowerCase() }, { "Statistics": totalCost.toUpperCase() }, { "Statistics": capitalizeFirstLetter(totalCost) }, { "Statistics": toTitleCase(totalCost) }] }

              ]

              db.collection("surgery").find({
                $and: filterarray
              }).toArray(function (err1, result1) {
                if (err1) throw err1;
                var html = '';
                if (result1.length > 0) {
                  for (var key in result1[0]) {
                    if (key != '_id' && key.toLowerCase() != "date" && key != "" && key.toLowerCase() != "type") {
                      if (key.toLowerCase() != "operation options" && key.toLowerCase() != "website" && key.toLowerCase() != "operation" && key.toLowerCase() != "orignal description" && key.toLowerCase() != "hospital") {

                        html += `${key}: ${result1[0][key]}\n`;
                      }
                      else {
                        html += `${result1[0][key]}\n`;
                      }
                    }
                  }
                  if (html) {
                    db.collection("surgery").find({
                      $and: [{ $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] }]
                    }).toArray(function (err2, result2) {
                      var finallarray = [];
                      var hospitalarray = [];
                      for (var keys in result) {
                        if (hospitalarray.indexOf(result[keys]["Statistics"]) < 0) {
                          if (result[keys]["Statistics"]) {
                            hospitalarray.push(result[keys]["Statistics"]);
                          }
                        }
                      }
                      for (var treatsurgiment in hospitalarray) {
                        var html1 = {};
                        html1["title"] = hospitalarray[treatsurgiment];
                        html1["payload"] = hospitalarray[treatsurgiment];
                        html1["content_type"] = "text";
                        finallarray.push(html1);
                      }
                      html += "\ninterested in min/max/median case instead? or other hospital?";
                      res.json({
                        speech: "",
                        displayText: "",
                        source: 'agent',
                        "messages": [
                          {
                            "type": 4,
                            "platform": "facebook",
                            "payload": {
                              "facebook": {
                                "text": html,
                                "quick_replies": finallarray
                              }
                            }
                          }
                        ]
                      })
                    })
                  }
                }
                else {
                  res.status(200).json({
                    source: 'webhook',
                    speech: "I didnt get that",
                    displayText: "I didnt get that"
                  })
                }
              });
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "Sorry I didnt get that. Select the Operation",
            displayText: "Sorry I didnt get that. Select the Operation"
          })
        }
      });
      db.close();
    });
  }
  if (action == "hospital.operation") {
    var hospitalarray = [];
    const hospitaltype = parameters.hospital_type != '' ? parameters.hospital_type : "";
    const treatmentyp = parameters.treatment_type != '' ? parameters.treatment_type : "";
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);

      }
      filterarray = [
        { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
        { $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err, result) {
        if (result.length > 0) {
          var hospitalarray = [];
          for (var keys in result) {
            if (hospitalarray.indexOf(result[keys]["Operation"]) < 0) {
              hospitalarray.push(result[keys]["Operation"]);
            }
          }
          var finallarray = [];
          for (var treatsurgiment in hospitalarray) {
            var html = {};
            html["title"] = hospitalarray[treatsurgiment];
            html["payload"] = hospitalarray[treatsurgiment];
            html["content_type"] = "text";
            finallarray.push(html);
          }
          if (html) {
            res.json({
              speech: "",
              displayText: "",
              source: 'agent',
              "messages": [
                {
                  "type": 4,
                  "platform": "facebook",
                  "payload": {
                    "facebook": {
                      "text": "Select the Operation type",
                      "quick_replies": finallarray
                    }
                  }
                }
              ]
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "Sorry I didnt get that. Select the type",
            displayText: "Sorry I didnt get that. Select the type"
          })
        }
      });
      db.close();
    });
  }

  if (action == "hospital.operationtypess") {
    var hospitalarray = [];
    const surgicaltyp = parameters.surgical_type != '' ? parameters.surgical_type : "";
    const treatmentyp = parameters.treatment_type != '' ? parameters.treatment_type : "";
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);

      }
      filterarray = [
        { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] },
        { $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err, result) {
        if (result.length > 0) {
          var hospitalarray = [];
          for (var keys in result) {
            if (hospitalarray.indexOf(result[keys]["HOSPITAL"]) < 0) {
              hospitalarray.push(result[keys]["HOSPITAL"]);
            }
          }
          var finallarray = [];
          for (var treatsurgiment in hospitalarray) {
            var html = {};
            html["title"] = hospitalarray[treatsurgiment];
            html["payload"] = hospitalarray[treatsurgiment];
            html["content_type"] = "text";
            finallarray.push(html);
          }
          if (html) {
            res.json({
              speech: "",
              displayText: "",
              source: 'agent',
              "messages": [
                {
                  "type": 4,
                  "platform": "facebook",
                  "payload": {
                    "facebook": {
                      "text": "Select the Hospital",
                      "quick_replies": finallarray
                    }
                  }
                }
              ]
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "Sorry I didnt get that. Select the type",
            displayText: "Sorry I didnt get that. Select the type"
          })
        }
      });
      db.close();
    });
  }


  if (action == "hospital") {
    var hospitalarray = [];
    const hospitaltype = parameters.hospital_type != '' ? parameters.hospital_type : "";
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);

      }
      filterarray = [
        { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err, result) {
        if (result.length > 0) {
          var hospitalarray = [];
          for (var keys in result) {
            if (hospitalarray.indexOf(result[keys]["TYPE"]) < 0) {
              hospitalarray.push(result[keys]["TYPE"]);
            }
          }
          var finallarray = [];
          for (var treatsurgiment in hospitalarray) {
            var html = {};
            html["title"] = hospitalarray[treatsurgiment];
            html["payload"] = hospitalarray[treatsurgiment];
            html["content_type"] = "text";
            finallarray.push(html);
          }

          if (html) {
            res.json({
              speech: "",
              displayText: "",
              source: 'agent',
              "messages": [
                {
                  "type": 4,
                  "platform": "facebook",
                  "payload": {
                    "facebook": {
                      "text": "Select the type",
                      "quick_replies": finallarray
                    }
                  }
                }
              ]
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "Sorry I didnt get that. Select the type",
            displayText: "Sorry I didnt get that. Select the type"
          })
        }
      });
      db.close();
    });
  }
  if (action == "input.operationoptions") {
    var hospitalarray = [];
    const surgicaltyp = parameters.surgical_type != '' ? parameters.surgical_type : "";
    const operationopt = parameters.operation_options != '' ? parameters.operation_options : "";
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);

      }
      filterarray = [
        { $or: [{ "operation Options": operationopt.toLowerCase() }, { "operation Options": operationopt.toUpperCase() }, { "operation Options": capitalizeFirstLetter(operationopt) }, { "operation Options": toTitleCase(operationopt) }] },
        { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err, result) {
        if (result.length > 0) {
          var hospitalarray = [];
          for (var keys in result) {
            if (hospitalarray.indexOf(result[keys]["HOSPITAL"]) < 0) {
              hospitalarray.push(result[keys]["HOSPITAL"]);
            }
          }
          var finallarray = [];
          for (var treatsurgiment in hospitalarray) {
            var html = {};
            html["title"] = hospitalarray[treatsurgiment];
            html["payload"] = hospitalarray[treatsurgiment];
            html["content_type"] = "text";
            finallarray.push(html);
          }

          if (html) {
            res.json({
              speech: "",
              displayText: "",
              source: 'agent',
              "messages": [
                {
                  "type": 4,
                  "platform": "facebook",
                  "payload": {
                    "facebook": {
                      "text": "Select the type",
                      "quick_replies": finallarray
                    }
                  }
                }
              ]
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "Sorry I didnt get that. Select the Operation Options",
            displayText: "Sorry I didnt get that. Select the Operation Options"
          })
        }
      });
      db.close();
    });
  }
  if (action == "operation.details1") {
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      const treatmentyp = parameters.treatment_type != '' ? parameters.treatment_type : "";
      if (err) {
        console.log(err);
      }
      filterarray = [{ $or: [{ "TYPE": treatmentyp.toLowerCase() }, { "TYPE": treatmentyp.toUpperCase() }, { "TYPE": capitalizeFirstLetter(treatmentyp) }, { "TYPE": toTitleCase(treatmentyp) }] }];
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err1, result1) {
        var hospitalarray = [];
        var finallarray = [];
        for (var keys in result1) {
          if (hospitalarray.indexOf(result1[keys]["Operation"]) < 0) {
            if (result1[keys]["TYPE"]) {
              hospitalarray.push(result1[keys]["Operation"]);
            }
          }
        }
        for (var treatsurgiment in hospitalarray) {
          var html1 = {};
          html1["title"] = hospitalarray[treatsurgiment];
          html1["payload"] = hospitalarray[treatsurgiment];
          html1["content_type"] = "text";
          finallarray.push(html1);
        }

        res.json({
          speech: "",
          displayText: "",
          source: 'agent',
          "messages": [
            {
              "type": 4,
              "platform": "facebook",
              "payload": {
                "facebook": {
                  "text": "Please Select the Operation",
                  "quick_replies": finallarray
                }
              }
            }
          ]
        })
      });
    });
  }
  if (action == "operation.type") {
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);
      }
      db.collection("surgery").find().toArray(function (err1, result1) {
        var hospitalarray = [];
        var finallarray = [];
        for (var keys in result1) {
          if (hospitalarray.indexOf(result1[keys]["TYPE"]) < 0) {
            if (result1[keys]["TYPE"]) {
              hospitalarray.push(result1[keys]["TYPE"]);
            }
          }
        }
        for (var treatsurgiment in hospitalarray) {
          var html1 = {};
          html1["title"] = hospitalarray[treatsurgiment];
          html1["payload"] = hospitalarray[treatsurgiment];
          html1["content_type"] = "text";
          finallarray.push(html1);
        }

        res.json({
          speech: "",
          displayText: "",
          source: 'agent',
          "messages": [
            {
              "type": 4,
              "platform": "facebook",
              "payload": {
                "facebook": {
                  "text": "Please Select the type",
                  "quick_replies": finallarray
                }
              }
            }
          ]
        })
      });
    });
  }
  if (action == "input.hospital1") {

    var surgicalarray = [];
    let hospitaltype = parameters.hospital_type != '' ? parameters.hospital_type : "";
    let surgicaltyp = parameters.surgical_type != '' ? parameters.surgical_type : "";
    let operationopt = parameters.hasOwnProperty('operation_options') && parameters.operation_options != '' ? parameters.operation_options : "";
    console.log(hospitaltype + "=>" + surgicaltyp + "=>" + operationopt);
    var totalCost;
    if (parameters.Statistics) {
      totalCost = (parameters.Statistics != "" && parameters.Statistics != null && parameters.Statistics != undefined) ? parameters.Statistics : "";
    }
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);
      }
      if (operationopt) {
        filterarray = [
          { $or: [{ "operation Options": operationopt.toLowerCase() }, { "operation Options": operationopt.toUpperCase() }, { "operation Options": capitalizeFirstLetter(operationopt) }, { "operation Options": toTitleCase(operationopt) }] },
          { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] },
          { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] }
        ]
      } else {
        console.log(JSON.stringify(req.body.result.contexts));
        hospitaltype = req.body.result.contexts[0].parameters.hospital_type ? req.body.result.contexts[0].parameters.hospital_type : req.body.result.contexts[0].parameters.hospital_type ? req.body.result.contexts[0].parameters.hospital_type : req.body.result.parameters.hospital_type;
        surgicaltyp = req.body.result.contexts[0].parameters.surgical_type ? req.body.result.contexts[0].parameters.surgical_type : req.body.result.contexts[0].parameters.surgical_type ? req.body.result.contexts[0].parameters.surgical_type : req.body.result.parameters.surgical_type;
        if (hospitaltype && surgicaltyp) {
          filterarray = [
            { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] },
            { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] }
          ]
        }
      }
      if (hospitaltype && surgicaltyp) {
        db.collection("surgery").find({
          $and: filterarray
        }).toArray(function (err1, result1) {
          if (err1) throw err1;
          var html = '';
          if (result1.length > 0) {
            for (var key1 in result1) {
              if (result1[key1]["Statistics"] == "50th percentile" || result1[key1]["Statistics"] == "Median") {

                for (var key in result1[key1]) {
                  if (key != '_id' && key.toLowerCase() != "date" && key != "" && key.toLowerCase() != "website") {
                    if (key.toLowerCase() != "operation options" && key.toLowerCase() != "type" && key.toLowerCase() != "operation" && key.toLowerCase() != "orignal description" && key.toLowerCase() != "hospital") {

                      html += `${key}: ${result1[0][key]}\n`;
                    }
                    else {
                      html += `${result1[0][key]}\n`;
                    }
                  }
                }
              }
            }
            if (html) {
              var finallarray = [];
              var hospitalarray = [];
              for (var keys in result1) {
                if (hospitalarray.indexOf(result1[keys]["Statistics"]) < 0) {
                  if (result1[keys]["Statistics"]) {
                    hospitalarray.push(result1[keys]["Statistics"]);
                  }
                }
              }
              for (var treatsurgiment in hospitalarray) {
                var html1 = {};
                html1["title"] = hospitalarray[treatsurgiment];
                html1["payload"] = hospitalarray[treatsurgiment];
                html1["content_type"] = "text";
                finallarray.push(html1);
              }
              html += "\ninterested in min/max/median case instead? or other hospital?";
              res.json({
                speech: "",
                displayText: "",
                source: 'agent',
                "messages": [
                  {
                    "type": 4,
                    "platform": "facebook",
                    "payload": {
                      "facebook": {
                        "text": html,
                        "quick_replies": finallarray
                      }
                    }
                  }
                ]
              })

            }
          }
          else {
            res.status(200).json({
              source: 'webhook',
              speech: "I didnt get that",
              displayText: "I didnt get that"
            })
          }
        });
        db.close();
      }
      else {
        res.status(200).json({
          source: 'webhook',
          speech: "I didnt get that",
          displayText: "I didnt get that"
        })
      }
    });

  }
  if (action == "input.hospital") {

    var surgicalarray = [];
    const surgicaltyp = parameters.surgical_type != '' ? parameters.surgical_type : "";
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      var db = database;
      if (err) {
        console.log(err);
      }
      filterarray = [
        { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] }
      ]
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err, result) {
        var surgicalarray = [];
        if (result.length > 0) {
          for (var keys in result) {
            if (result[keys]["operation Options"] != "") {
              if (surgicalarray.indexOf(result[keys]["operation Options"]) < 0 && result[keys]["operation Options"]) {
                surgicalarray.push(result[keys]["operation Options"]);
              }
            }
          }
          if (surgicalarray.length == 0 && result.length > 0) {
            for (var keys in result) {
              if (surgicalarray.indexOf(result[keys]["HOSPITAL"]) < 0 && result[keys]["HOSPITAL"]) {
                surgicalarray.push(result[keys]["HOSPITAL"]);
              }
            }
            var finallarray = [];
            for (var treatsurgiment in surgicalarray) {
              var html = {};
              html["title"] = surgicalarray[treatsurgiment];
              html["payload"] = surgicalarray[treatsurgiment];
              html["content_type"] = "text";
              finallarray.push(html);
            }
            if (html) {
              res.json({
                speech: "",
                displayText: "",
                source: 'agent',
                "messages": [
                  {
                    "type": 4,
                    "platform": "facebook",
                    "payload": {
                      "facebook": {
                        "text": "Please Select Hospital?",
                        "quick_replies": finallarray
                      }
                    }
                  }
                ]
              })
            }
          }
          else {
            var finallarray = [];
            for (var treatsurgiment in surgicalarray) {
              var html = {};
              html["title"] = surgicalarray[treatsurgiment];
              html["payload"] = surgicalarray[treatsurgiment];
              html["content_type"] = "text";
              finallarray.push(html);
            }
            if (html) {
              res.json({
                speech: "",
                displayText: "",
                source: 'agent',
                "messages": [
                  {
                    "type": 4,
                    "platform": "facebook",
                    "payload": {
                      "facebook": {
                        "text": "Please Choose Operation Options?",
                        "quick_replies": finallarray
                      }
                    }
                  }
                ]
              })
            }
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "I didnt get that",
            displayText: "I didnt get that"
          })
        }

      });
      db.close();
    });

  }
  if (action == "input.surgery") {
    let hospitaltype = parameters.hospital_type;
    let surgicaltyp;
    let treatmentyp;
    let operationopt;
    if (parameters.hasOwnProperty('surgical_type')) {
      surgicaltyp = parameters.surgical_type;
    }
    if (parameters.hasOwnProperty('treatment_type')) {
      treatmentyp = parameters.treatment_type;
    }
    if (parameters.hasOwnProperty("operation_options")) {
      operationopt = parameters.operation_options;

    }
    const totalCost = parameters.Statistics;
    console.log(JSON.stringify(parameters));
    mongodb.MongoClient.connect("mongodb://admin:admin123@ds149335.mlab.com:49335/hospital", function (err, database) {
      if (err) {
        console.log(err);
      }
      var db = database;
      if (operationopt) {
        filterarray = [
          { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
          { $or: [{ "operation Options": operationopt.toLowerCase() }, { "operation Options": operationopt.toUpperCase() }, { "operation Options": capitalizeFirstLetter(operationopt) }, { "operation Options": toTitleCase(operationopt) }] },
          { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] },
          { $or: [{ "Statistics": totalCost.toLowerCase() }, { "Statistics": totalCost.toUpperCase() }, { "Statistics": capitalizeFirstLetter(totalCost) }, { "Statistics": toTitleCase(totalCost) }] }


        ];
      }
      else {
        filterarray = [
          { $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
          { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] },
          { $or: [{ "Statistics": totalCost.toLowerCase() }, { "Statistics": totalCost.toUpperCase() }, { "Statistics": capitalizeFirstLetter(totalCost) }, { "Statistics": toTitleCase(totalCost) }] }

        ];
      }
      db.collection("surgery").find({
        $and: filterarray
      }).toArray(function (err1, result1) {
        if (err1) throw err1;
        var html = '';
        if (result1.length > 0) {
          for (var key in result1[0]) {
            if (key != '_id' && key.toLowerCase() != "date" && key != "" && key.toLowerCase() != "website") {
              if (key.toLowerCase() != "operation options" && key.toLowerCase() != "type" && key.toLowerCase() != "operation" && key.toLowerCase() != "orignal description" && key.toLowerCase() != "hospital") {

                html += `${key}: ${result1[0][key]}\n`;
              }
              else {
                html += `${result1[0][key]}\n`;
              }
            }

          }
          if (operationopt) {
            filterarray = [{ $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
            { $or: [{ "operation Options": operationopt.toLowerCase() }, { "operation Options": operationopt.toUpperCase() }, { "operation Options": capitalizeFirstLetter(operationopt) }, { "operation Options": toTitleCase(operationopt) }] },
            { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] }];
          }
          else {
            filterarray = [{ $or: [{ "HOSPITAL": hospitaltype.toLowerCase() }, { "HOSPITAL": hospitaltype.toUpperCase() }, { "HOSPITAL": capitalizeFirstLetter(hospitaltype) }, { "HOSPITAL": toTitleCase(hospitaltype) }] },
            { $or: [{ "Operation": surgicaltyp.toLowerCase() }, { "Operation": surgicaltyp.toUpperCase() }, { "Operation": capitalizeFirstLetter(surgicaltyp) }, { "Operation": toTitleCase(surgicaltyp) }] }];
          }
          if (html) {
            db.collection("surgery").find({
              $and: filterarray
            }).toArray(function (err2, result2) {
              console.log(JSON.stringify(result2));
              var finallarray = [];
              var hospitalarray = [];
              for (var keys in result2) {
                if (hospitalarray.indexOf(result2[keys]["Statistics"]) < 0) {
                  if (result2[keys]["Statistics"]) {
                    hospitalarray.push(result2[keys]["Statistics"]);
                  }
                }
              }
              for (var treatsurgiment in hospitalarray) {
                var html1 = {};
                html1["title"] = hospitalarray[treatsurgiment];
                html1["payload"] = hospitalarray[treatsurgiment];
                html1["content_type"] = "text";
                finallarray.push(html1);
              }
              html += "\ninterested in min/max/median case instead? or other hospital?";
              res.json({
                speech: "",
                displayText: "",
                source: 'agent',
                "messages": [
                  {
                    "type": 4,
                    "platform": "facebook",
                    "payload": {
                      "facebook": {
                        "text": html,
                        "quick_replies": finallarray
                      }
                    }
                  }
                ]
              })
            })
          }
        }
        else {
          res.status(200).json({
            source: 'webhook',
            speech: "I didnt get that",
            displayText: "I didnt get that"
          })
        }
      });
    });

  }
});
app.get("/formupload", function (req, res) {
  res.sendFile(__dirname + '/uploadform.html');
});
app.get('/ricohwebsite', function (req, res) {
  res.sendfile(__dirname + '/myricoh.html');
});
app.get("/doctorupload", function (req, res) {
  res.sendFile(__dirname + '/doctorform.html');
});
app.get('/chat', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.listen(process.env.PORT || 7000);
